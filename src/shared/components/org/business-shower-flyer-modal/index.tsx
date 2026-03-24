import { useState } from 'react';
import { jsPDF } from 'jspdf';
import '../custom-flyer-modal/custom-flyer-modal.css';

interface BusinessShowerFlyerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BusinessShowerFlyerModal({
  isOpen,
  onClose,
}: BusinessShowerFlyerModalProps) {
  const [formData, setFormData] = useState({
    guestName: '',
    location: '',
    address: '',
    date: '',
    time: '',
    theme: '',
    headshotPicture: null as File | null,
  });
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormData((prev) => ({
      ...prev,
      headshotPicture: file,
    }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setHeadshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generateFlyer = async () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgPath = '/images/business-shower.jpeg';
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = async function () {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight);

        pdf.setTextColor(255, 200, 0);
        pdf.setFont('helvetica', 'bold');

        if (formData.guestName) {
          pdf.setFontSize(14);
          pdf.text(`${formData.guestName}`, pageWidth / 2 + 10, 35, {
            align: 'center',
          });
        }

        if (formData.date) {
          pdf.setFontSize(14);
          pdf.text(formData.date, 40, 115);
        }

        if (formData.time) {
          pdf.setFontSize(14);
          pdf.text(formData.time, pageWidth - 40, 115, { align: 'right' });
        }

        if (formData.location) {
          pdf.setTextColor(255, 200, 0);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(14);
          const locLines = pdf.splitTextToSize(formData.location, 100);
          pdf.text(locLines, pageWidth - 50, 125, { align: 'right' });
        }

        if (formData.address) {
          pdf.setTextColor(255, 200, 0);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(14);
          const addressLines = formData.address.split(' ').filter(Boolean);
          pdf.text(addressLines, pageWidth - 50, 130, { align: 'right' });
        }

        if (headshotPreview) {
          try {
            const headshotImg = new Image();
            headshotImg.src = headshotPreview;
            await new Promise((resolve) => {
              headshotImg.onload = resolve;
            });

            const headshotSize = 45;
            const headshotX = (pageWidth - headshotSize) / 2;
            const headshotY = 120;

            pdf.addImage(
              headshotImg,
              'JPEG',
              headshotX,
              headshotY,
              headshotSize,
              headshotSize
            );
          } catch (error) {
            console.error('Error adding headshot:', error);
          }
        }

        const fileName = `Business-Shower-${formData.guestName || 'Flyer'}.pdf`;
        pdf.save(fileName);

        setFormData({
          guestName: '',
          location: '',
          address: '',
          date: '',
          time: '',
          theme: '',
          headshotPicture: null,
        });
        setHeadshotPreview(null);
        onClose();
      };

      img.onerror = function () {
        alert(
          'Error loading business shower image. Please ensure business-shower.jpeg exists in public/images/'
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
          <h2 className="custom-flyer-title">
            Business Shower & Venture Kickoff Flyer
          </h2>
          <button
            className="custom-flyer-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="custom-flyer-form">
          <div className="custom-flyer-field">
            <label htmlFor="guestName" className="custom-flyer-label-text">
              Guest Name:
            </label>
            <input
              type="text"
              id="guestName"
              name="guestName"
              value={formData.guestName}
              onChange={handleInputChange}
              placeholder="Enter guest name"
              className="custom-flyer-input custom-flyer-input-simple"
              required
            />
          </div>

          <div className="custom-flyer-field">
            <label htmlFor="date" className="custom-flyer-label-text">
              Date:
            </label>
            <input
              type="text"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              placeholder="mm/dd/yyyy"
              className="custom-flyer-input custom-flyer-input-simple"
            />
          </div>

          <div className="custom-flyer-field">
            <label htmlFor="time" className="custom-flyer-label-text">
              Time:
            </label>
            <input
              type="text"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
              placeholder="e.g., 04:00 PM"
              className="custom-flyer-input custom-flyer-input-simple"
            />
          </div>

          <div className="custom-flyer-field">
            <label htmlFor="location" className="custom-flyer-label-text">
              Location:
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Street address"
              className="custom-flyer-input custom-flyer-input-simple"
            />
          </div>

          <div className="custom-flyer-field">
            <label htmlFor="address" className="custom-flyer-label-text">
              Address:
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="City, State, ZIP"
              className="custom-flyer-input custom-flyer-input-simple"
            />
          </div>

          <div className="custom-flyer-field">
            <label htmlFor="headshotPicture" className="custom-flyer-label-text">
              Headshot (Optional)
            </label>
            <input
              type="file"
              id="headshotPicture"
              name="headshotPicture"
              accept="image/*"
              onChange={handleFileChange}
              className="custom-flyer-file-input"
            />
          </div>

          {headshotPreview && (
            <div className="custom-flyer-preview">
              <img
                src={headshotPreview}
                alt="Headshot preview"
                className="custom-flyer-preview-img"
              />
            </div>
          )}

          <button type="submit" className="custom-flyer-generate-btn">
            Generate Flyer
          </button>
        </form>
      </div>
    </div>
  );
}
