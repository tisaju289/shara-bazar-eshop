import { TTables, TViews, TFuncs, TSchema, TBrand, TProd, TRoles, THasRole } from "./probe";
const c = <T,>(v: T) => v;
export const vals = { TTables: c<TTables>(1), TViews: c<TViews>(1), TFuncs: c<TFuncs>(1), TSchema: c<TSchema>(1), TBrand: c<TBrand>(1), TProd: c<TProd>(1), TRoles: c<TRoles>(1), THasRole: c<THasRole>(1) };
