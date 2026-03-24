import { useState } from 'react';
import { jsPDF } from 'jspdf';
import './custom-flyer-modal.css';

interface CustomFlyerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomFlyerModal({
  isOpen,
  onClose,
}: CustomFlyerModalProps) {
  const [formData, setFormData] = useState({
    celebrantName: '',
    birthDate: '',
    time: '',
    location: '',
    message: '',
    zoomLink: '',
    meetingId: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const generateFlyer = async () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgPath = '/images/custom-flyer.jpeg';
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = function () {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight);

        pdf.setTextColor(255, 255, 255);

        if (formData.birthDate) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(18);
          const dateLines = formData.birthDate.split(' ').filter(Boolean);
          pdf.text(dateLines, pageWidth * 0.25 - 14, 168, { align: 'center' });
        }

        if (formData.time) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(18);
          const timeLines = formData.time.split(' ').filter(Boolean);
          pdf.text(timeLines, pageWidth * 0.75 + 15, 170, { align: 'center' });
        }

        if (formData.message) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          const messageLines = pdf.splitTextToSize(formData.message, 90);
          pdf.text(messageLines, pageWidth / 2, 165, { align: 'center' });
        }

        if (formData.celebrantName) {
          pdf.setTextColor(255, 200, 0);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(16);
          pdf.text(formData.celebrantName, pageWidth / 2, 215, {
            align: 'center',
          });
        }

        if (formData.location) {
          pdf.setTextColor(255, 200, 0);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.text(formData.location, pageWidth / 2, 230, {
            align: 'center',
          });
        }

        if (formData.zoomLink) {
          pdf.setTextColor(255, 200, 0);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.text(formData.zoomLink, pageWidth / 2, 235, {
            align: 'center',
          });
        }

        if (formData.meetingId) {
          pdf.setTextColor(255, 200, 0);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.text(`Meeting ID: ${formData.meetingId}`, pageWidth / 2, 245, {
            align: 'center',
          });
        }

        const fileName = `NAL-Flyer-${formData.celebrantName || 'Birthday'}.pdf`;
        pdf.save(fileName);

        setFormData({
          celebrantName: '',
          birthDate: '',
          time: '',
          location: '',
          message: '',
          zoomLink: '',
          meetingId: '',
        });
        onClose();
      };

      img.onerror = function () {
        alert(
          'Error loading custom flyer image. Please ensure custom-flyer.jpeg exists in public/images/'
        );
      };

      img.src = imgPath;
    } catch (error) {
      console.error('Error generating flyer:', error);
      alert('Error generating flyer. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    generateFlyer();
  };

  if (!isOpen) return null;

  return (
    <div className="custom-flyer-modal-overlay" onClick={onClose}>
      <div className="custom-flyer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="custom-flyer-header">
          <h2 className="custom-flyer-title">Custom Flyer Form - NAL</h2>
          <button
            className="custom-flyer-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <p className="custom-flyer-subtitle">
          Empower your future with new possibilities
        </p>

        <form onSubmit={handleSubmit} className="custom-flyer-form">
          <div className="custom-flyer-field">
            <label htmlFor="celebrantName" className="custom-flyer-label-text">
              Celebrant Name
            </label>
            <input
              type="text"
              id="celebrantName"
              name="celebrantName"
              value={formData.celebrantName}
              onChange={handleInputChange}
              placeholder="Enter celebrant's name"
              className="custom-flyer-input custom-flyer-input-simple"
              required
            />
          </div>

          <div className="custom-flyer-field">
            <label htmlFor="birthDate" className="custom-flyer-label-text">
              Birth Date
            </label>
            <input
              type="text"
              id="birthDate"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleInputChange}
              placeholder="e.g., Aug 10 2025"
              className="custom-flyer-input custom-flyer-input-simple"
            />
          </div>

          <div className="custom-flyer-field">
            <label htmlFor="time" className="custom-flyer-label-text">
              Time
            </label>
            <input
              type="text"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
              placeholder="e.g., 5:00 PM"
              className="custom-flyer-input custom-flyer-input-simple"
            />
          </div>

          <div className="custom-flyer-field">
            <label htmlFor="location" className="custom-flyer-label-text">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Enter location"
              className="custom-flyer-input custom-flyer-input-simple"
            />
          </div>

          <div className="custom-flyer-field">
            <label htmlFor="message" className="custom-flyer-label-text">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Add your personal message..."
              className="custom-flyer-textarea"
              rows={4}
            />
          </div>

          <div className="custom-flyer-field">
            <label htmlFor="zoomLink" className="custom-flyer-label-text">
              Zoom Link (Optional)
            </label>
            <input
              type="text"
              id="zoomLink"
              name="zoomLink"
              value={formData.zoomLink}
              onChange={handleInputChange}
              placeholder="Enter Zoom link"
              className="custom-flyer-input custom-flyer-input-simple"
            />
          </div>

          <div className="custom-flyer-field">
            <label htmlFor="meetingId" className="custom-flyer-label-text">
              Meeting ID (Optional)
            </label>
            <input
              type="text"
              id="meetingId"
              name="meetingId"
              value={formData.meetingId}
              onChange={handleInputChange}
              placeholder="Enter meeting ID"
              className="custom-flyer-input custom-flyer-input-simple"
            />
          </div>

          <button type="submit" className="custom-flyer-generate-btn">
            Generate Flyer
          </button>
        </form>
      </div>
    </div>
  );
}
