import { Hono } from "hono";
import { Bindings } from "../../../types";
import { loginUser, onBoardUser, registerUser } from "../../../handlers/auth";
import { verifyToken } from "../../../middlewares/verifyToken";

export const authRouter = new Hono<{ Bindings: Bindings }>();

authRouter.post("/register", ...registerUser);
authRouter.post("/onboard", verifyToken, ...onBoardUser);
authRouter.post("/login", ...loginUser);
