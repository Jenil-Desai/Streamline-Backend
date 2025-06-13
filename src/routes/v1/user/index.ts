import { Hono } from "hono";
import { Bindings } from "../../../types";
import { destroyUserProfile, getUserProfile, updateUserProfile } from "../../../handlers/user";
import { verifyToken } from "../../../middlewares/verifyToken";

export const userRouter = new Hono<{ Bindings: Bindings }>();

userRouter.get("/profile", verifyToken, ...getUserProfile);
userRouter.put("/profile", verifyToken, ...updateUserProfile);
userRouter.delete("/profile", verifyToken, ...destroyUserProfile);
