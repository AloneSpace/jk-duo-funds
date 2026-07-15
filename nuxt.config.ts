// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
  ],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  routeRules: {
    "/": { ssr: true },
    "/login": { ssr: true },
  },

  compatibilityDate: "2026-06-30",

  typescript: {
    strict: true,
  },

  future: {
    compatibilityVersion: 4,
  },

  nitro: {
    preset: "firebase-app-hosting",
  },

  runtimeConfig: {
    geminiApiKey: "",
    public: {
      firebaseApiKey: "",
      firebaseAuthDomain: "",
      firebaseProjectId: "",
      firebaseStorageBucket: "",
      firebaseMessagingSenderId: "",
      firebaseAppId: "",
      firebaseMeasurementId: "",
      firebaseEmulators: false,
    },
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
      },
    },
  },

  // Tesseract.js must not be bundled by Nitro — it uses native Node.js APIs
  nitro: {
    externals: {
      external: ["tesseract.js"],
    },
  },
});
