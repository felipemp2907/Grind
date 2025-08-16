import { publicProcedure } from "../../create-context";

export const healthPingProcedure = publicProcedure.query(() => {
  return "ok" as const;
});

export default healthPingProcedure;
