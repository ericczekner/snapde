import type { Config } from "tailwindcss";
const { nextui } = require("@nextui-org/react");

export default {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
		"./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				background: "#F8F9FA",
				foreground: "var(--foreground)",
				primary: "#3A86FF",
				secondary: "#FFBE0B",
				accentPurple: "#8338EC",
				darkGray: "#212529",
				white: "#FFFFFF",
				lightGray: "#F8F9FA",
				danger: "#FF0000",
				warning: "#FFA500",
			},
		},
	},
	darkMode: "class",
	plugins: [nextui()],
} satisfies Config;
