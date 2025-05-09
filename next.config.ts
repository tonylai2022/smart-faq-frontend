import { NextConfig } from 'next';

const config: NextConfig = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
  },
  reactStrictMode: true,
};

export default config;
