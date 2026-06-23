import { useState } from "react";
import type { PromotionModule, PromotionSkill } from "../types";
import { QuizPanel } from "./quiz-panel";

const moduleLabel = (status: PromotionModule["status"]) =>
  ({
    pending: "Awaiting Video",
    watch: "Ready to Watch",
    quiz: "Quiz Pending",
    done: "Complete",
  })[status];

export function SkillsCard({
  skills,
  done,
  total,
  onToggle,
  onRefresh,
}: {
  skills: PromotionSkill[];
  done: number;
  total: number;
  onToggle: (id: number) => void;
  onRefresh: () => void;
}) {
  const [openSkill, setOpenSkill] = useState<number | null>(null);
  const [openModule, setOpenModule] = useState<number | null>(null);

  return (
    <section className="promo-skills-card">
      <div className="promo-card-head">
        <h2>Skills to Master</h2>
        <span>
          {done}/{total}
        </span>
      </div>
      {skills.map((skill) => {
        const multipleModules = skill.total_modules > 1;
        const badge = skill.is_complete
          ? "Course Complete"
          : skill.modules_done
            ? "In Progress"
            : "Pending Video";

        return (
          <div className="promo-skill" key={skill.id}>
            <div
              className="promo-skill-row"
              onClick={() =>
                setOpenSkill(openSkill === skill.id ? null : skill.id)
              }
            >
              <button
                className={`promo-check ${skill.is_complete ? "on" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(skill.id);
                }}
                aria-label={`Toggle ${skill.label}`}
              />
              <div className="promo-skill-copy">
                <div>{skill.label}</div>
                <small>
                  {multipleModules
                    ? `${skill.total_modules} videos · ${skill.modules_done}/${skill.total_modules} complete`
                    : "1 video"}
                </small>
              </div>
              <span className={`promo-tag ${skill.tag}`}>
                {skill.tag === "action" ? "Action" : "Skill"}
              </span>
              <span
                className={`promo-badge ${
                  skill.is_complete
                    ? "done"
                    : skill.modules_done
                      ? "progress"
                      : "pending"
                }`}
              >
                {badge}
              </span>
              <b className={openSkill === skill.id ? "open" : ""}>▼</b>
            </div>
            {openSkill === skill.id && (
              <div className="promo-modules">
                {skill.modules.map((module, index) => (
                  <div key={module.id}>
                    <button
                      className="promo-module-row"
                      onClick={() =>
                        setOpenModule(
                          openModule === module.id ? null : module.id,
                        )
                      }
                    >
                      <em>{String(index + 1).padStart(2, "0")}</em>
                      <span>
                        <strong>{module.title}</strong>
                        <small>{module.duration_label}</small>
                      </span>
                      <i className={module.status}>
                        {moduleLabel(module.status)}
                      </i>
                    </button>
                    {openModule === module.id && (
                      <QuizPanel module={module} onComplete={onRefresh} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <p className="promo-skills-hint">
        Click any skill to open its video course. Watch each video, then answer
        the quiz before moving to the next.
      </p>
    </section>
  );
}
