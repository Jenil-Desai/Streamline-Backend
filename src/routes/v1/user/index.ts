import { Hono } from "hono";
import { Bindings } from "../../../types";

export const userRouter = new Hono<{ Bindings: Bindings }>();
