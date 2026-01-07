import * as React from 'react';

interface ImageUploadEmailProps {
  dishName: string;
  nickname?: string;
  imageUrl: string;
}

export const ImageUploadEmail: React.FC<ImageUploadEmailProps> = ({
  dishName,
  nickname,
  imageUrl,
}) => (
  <div style={{ fontFamily: 'sans-serif', lineHeight: '1.5', color: '#333' }}>
    <h2 style={{ color: '#000' }}>New Image Upload</h2>

    <div style={{ marginBottom: '20px' }}>
      <p style={{ margin: '0 0 10px 0' }}>
        <strong>Dish:</strong> {dishName}
      </p>

      <p style={{ margin: '0 0 10px 0' }}>
        <strong>Uploaded by:</strong> {nickname || 'Anonymous'}
      </p>

      <div style={{ marginTop: '20px' }}>
        <p style={{ margin: '0 0 10px 0' }}>
          <strong>New Image:</strong>
        </p>
        <img
          src={imageUrl}
          alt={`Upload for ${dishName}`}
          style={{
            maxWidth: '100%',
            maxHeight: '300px',
            borderRadius: '8px',
            objectFit: 'cover',
          }}
        />
        <p style={{ fontSize: '14px' }}>
          <a href={imageUrl} style={{ color: '#0070f3' }}>
            View full size image
          </a>
        </p>
      </div>
    </div>

    <hr
      style={{
        border: 'none',
        borderTop: '1px solid #eaeaea',
        margin: '20px 0',
      }}
    />

    <p style={{ fontSize: '14px', color: '#666' }}>
      Please review and approve or reject this image in the dashboard.
    </p>
  </div>
);

export default ImageUploadEmail;
