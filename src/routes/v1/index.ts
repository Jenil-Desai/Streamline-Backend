import { Bindings } from '../../types';
import { userRouter } from './user';
import { authRouter } from './auth';
import { homeRouter } from './home';
import { searchRouter } from './search';
import { watchlistsRouter } from './watchlists';
import { Hono } from 'hono';

export const v1Router = new Hono<{ Bindings: Bindings }>();

v1Router.route('/user', userRouter);
v1Router.route('/auth', authRouter);
v1Router.route('/home', homeRouter);
v1Router.route('/search', searchRouter);
v1Router.route('/watchlists', watchlistsRouter);