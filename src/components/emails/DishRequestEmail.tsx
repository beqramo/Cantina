import * as React from 'react';

interface DishRequestEmailProps {
  name: string;
  requestedBy: string; // This is the ID, ideally we'd pass a name/email if available, or just "User ID: ..."
  nickname?: string;
  imageUrl?: string;
  category?: string;
  tags?: string[];
}

export const DishRequestEmail: React.FC<DishRequestEmailProps> = ({
  name,
  nickname,
  imageUrl,
  category,
  tags,
}) => (
  <div style={{ fontFamily: 'sans-serif', lineHeight: '1.5', color: '#333' }}>
    <h2 style={{ color: '#000' }}>New Dish Request</h2>

    <div style={{ marginBottom: '20px' }}>
      <p style={{ margin: '0 0 10px 0' }}>
        <strong>Dish Name:</strong> {name}
      </p>

      <p style={{ margin: '0 0 10px 0' }}>
        <strong>Requested by:</strong> {nickname || 'Anonymous'}
      </p>

      {category && (
        <p style={{ margin: '0 0 10px 0' }}>
          <strong>Category:</strong> {category}
        </p>
      )}

      {tags && tags.length > 0 && (
        <p style={{ margin: '0 0 10px 0' }}>
          <strong>Tags:</strong> {tags.join(', ')}
        </p>
      )}

      {imageUrl && (
        <div style={{ marginTop: '20px' }}>
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>Image:</strong>
          </p>
          <img
            src={imageUrl}
            alt={name}
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
      )}
    </div>

    <hr
      style={{
        border: 'none',
        borderTop: '1px solid #eaeaea',
        margin: '20px 0',
      }}
    />

    <p style={{ fontSize: '14px', color: '#666' }}>
      Please review and approve or reject this request in the dashboard.
    </p>
  </div>
);

export default DishRequestEmail;
