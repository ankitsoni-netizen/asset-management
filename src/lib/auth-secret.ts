export const AUTH_SECRET =
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  "TPYD7vXK/cV1pO+bsv/xotlU0SI2PzycRIwRjo0mkaM=";
