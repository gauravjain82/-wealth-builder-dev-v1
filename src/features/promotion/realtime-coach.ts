/**
 * Sophia's voice call: a WebRTC session with the OpenAI Realtime model, ported from
 * wealthbuilderagent's static/index.html. The audio goes browser ↔ OpenAI directly;
 * the `grade_answer` tool calls are relayed to our backend, which grades and stores
 * them, and the result is handed back to the model.
 */

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

export interface GradeCallArgs {
  question: string;
  answer: string;
  /** Everything the learner said since the last graded answer (raw speech-to-text). */
  speech_transcript: string;
}

export interface RealtimeCoachHandlers {
  onAgentText: (text: string) => void;
  onLearnerText: (text: string) => void;
  /** Grade one answer; the returned object is passed back to the model as the tool result. */
  onGrade: (args: GradeCallArgs) => Promise<unknown>;
  onLive: () => void;
  onError: (message: string) => void;
}

/** Thrown when the microphone cannot be used, so the caller can offer typed answers. */
export class MicrophoneUnavailableError extends Error {}

interface RealtimeEvent {
  type: string;
  transcript?: string;
  item?: { type?: string; name?: string; call_id?: string; arguments?: string };
  error?: { message?: string };
}

export class RealtimeCoachSession {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audio: HTMLAudioElement | null = null;
  private learnerSpeech: string[] = [];

  constructor(private readonly handlers: RealtimeCoachHandlers) {}

  /** Whether this browser can capture audio at all. */
  static isSupported(): boolean {
    return Boolean(navigator.mediaDevices?.getUserMedia) && "RTCPeerConnection" in window;
  }

  /** Ask for the microphone before spending a session, so a refusal costs nothing. */
  static async checkMicrophone(): Promise<void> {
    if (!RealtimeCoachSession.isSupported()) {
      throw new MicrophoneUnavailableError("This browser can't record audio.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      throw new MicrophoneUnavailableError("Microphone access was blocked.");
    }
  }

  /** Connect with the short-lived key from our backend and let Sophia speak first. */
  async start(clientSecret: string): Promise<void> {
    const pc = new RTCPeerConnection();
    this.pc = pc;
    this.audio = new Audio();
    this.audio.autoplay = true;
    pc.ontrack = (e) => {
      if (this.audio) this.audio.srcObject = e.streams[0];
    };

    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.stop();
      throw new MicrophoneUnavailableError("Microphone access was blocked.");
    }
    pc.addTrack(mic.getTracks()[0]);

    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onopen = () => {
      this.handlers.onLive();
      dc.send(JSON.stringify({ type: "response.create" }));
    };
    dc.onmessage = (e) => void this.onEvent(JSON.parse(e.data) as RealtimeEvent);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const sdp = await fetch(REALTIME_CALLS_URL, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp",
      },
    });
    if (!sdp.ok) {
      this.stop();
      throw new Error("Couldn't connect to the AI coach. Please try again.");
    }
    await pc.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
  }

  /** Hang up and release the microphone. */
  stop(): void {
    this.pc?.getSenders().forEach((s) => s.track?.stop());
    this.pc?.close();
    if (this.audio) this.audio.srcObject = null;
    this.pc = null;
    this.dc = null;
    this.audio = null;
  }

  private async onEvent(ev: RealtimeEvent): Promise<void> {
    switch (ev.type) {
      case "response.output_audio_transcript.done":
        if (ev.transcript) this.handlers.onAgentText(ev.transcript);
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (ev.transcript?.trim()) {
          this.learnerSpeech.push(ev.transcript.trim());
          this.handlers.onLearnerText(ev.transcript.trim());
        }
        break;
      case "response.output_item.done":
        if (ev.item?.type === "function_call" && ev.item.name === "grade_answer") {
          await this.handleGrade(ev.item);
        }
        break;
      case "error":
        this.handlers.onError(ev.error?.message || "The AI coach reported an error.");
        break;
    }
  }

  private async handleGrade(call: NonNullable<RealtimeEvent["item"]>): Promise<void> {
    let output: unknown;
    try {
      const args = JSON.parse(call.arguments || "{}") as Partial<GradeCallArgs>;
      output = await this.handlers.onGrade({
        question: args.question ?? "",
        answer: args.answer ?? "",
        speech_transcript: this.learnerSpeech.join(" "),
      });
    } catch (err) {
      output = { error: err instanceof Error ? err.message : "Grading failed" };
    }
    this.learnerSpeech = [];
    this.dc?.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(output),
        },
      }),
    );
    this.dc?.send(JSON.stringify({ type: "response.create" }));
  }
}
