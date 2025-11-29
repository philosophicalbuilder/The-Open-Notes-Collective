/** @type {import('next').NextConfig} */
const nextConfig = {
    // Fix workspace root detection issue
    experimental: {
        turbo: {
            root: process.cwd(),
        },
    },
}

module.exports = nextConfig


