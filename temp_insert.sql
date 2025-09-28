INSERT INTO users (id, email, display_name) VALUES ('595d5533-2098-4546-b43c-70cad3e16510', 'hersungjin23@naver.com', 'hersungjin') ON CONFLICT (id) DO NOTHING;
