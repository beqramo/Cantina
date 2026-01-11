import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Img,
  Link,
  Hr,
  Button,
} from '@react-email/components';

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
  <Html>
    <Head />
    <Preview>New Image Upload for {dishName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Image Upload</Heading>

        <Section style={section}>
          <Text style={text}>
            <strong>Dish:</strong> {dishName}
          </Text>
          <Text style={text}>
            <strong>Uploaded by:</strong> {nickname || 'Anonymous'}
          </Text>

          <Text style={text}>
            <strong>New Image:</strong>
          </Text>
          <Img
            src={imageUrl}
            alt={`Upload for ${dishName}`}
            width='100%'
            style={image}
          />

          <Section style={buttonContainer}>
            <Button
              href='https://cantina-ipb.web.app/admin/dashboard'
              style={dashboardButton}>
              Review in Dashboard
            </Button>
            <Text style={text}>
              <Link href={imageUrl} style={link}>
                View full size image
              </Link>
            </Text>
          </Section>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Please review and approve or reject this image in the dashboard.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const section = {
  padding: '0 48px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  padding: '0 48px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
};

const image = {
  borderRadius: '8px',
  marginTop: '16px',
  objectFit: 'cover' as const,
};

const buttonContainer = {
  marginTop: '16px',
};

const link = {
  color: '#0070f3',
  fontSize: '14px',
  textDecoration: 'underline',
};

const dashboardButton = {
  backgroundColor: '#0070f3',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px 0',
  marginBottom: '16px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 48px',
};

export default ImageUploadEmail;
