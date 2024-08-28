// currently from https://github.com/microsoft/TypeScript/issues/27024 for 'readonly' test
export type TypeEqual<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false

export type ModifiableKeys<T, TT = {[K in keyof T]-?: NonNullable<T[K]>}> =
  { [K in KeyOf<TT>]: TypeEqual<Pick<TT, K>, Record<K, TT[K]>> extends true ? K : never }[KeyOf<TT>]

export type DEFAULTLEAFTYPE = number | string | boolean | symbol | Function | Date | BigInt | RegExp

type Merge<T, D extends T, P extends Partial<T>> = { [K in keyof T]: K extends keyof P ? P[K] : D[K] }

type CONFIGTYPE = {
  LEAFKEY: string | never,
  LEAFTYPE: unknown,
  DEEPREADONLY: boolean
}

type DEFAULTCONFIG = {
  LEAFKEY: never,
  LEAFTYPE: DEFAULTLEAFTYPE,
  DEEPREADONLY: false
}

export type PathConfigOption = Partial<CONFIGTYPE>;

export type PathConfig<Options extends PathConfigOption = {}> = Merge<CONFIGTYPE, DEFAULTCONFIG, Options>

type KEYTYPE = number | string

type FilteredKey<K> =
  K extends string | number
    ? K extends `${string}${"_" | "$"}${string}` | ''
        ? never
        : K
    : never

type KeyOf<T> = FilteredKey<
  number extends keyof T
    ? keyof T extends keyof []
      ? number | Exclude<keyof T, Exclude<keyof T, 'length'>>
      : Exclude<keyof T, keyof []>
    : keyof T
>

type KeyToPath<K extends KEYTYPE> =
  K extends `${infer N extends number}`
    ? `_\$${N}`
    : `_${K}`

type KeyToPathRaw<K extends KEYTYPE> =
  K extends `${infer N extends number}`
    ? `_\$${N}`
    : K extends number
      ? '_${number}'
      : `_${K}`

type _Path<T, C extends CONFIGTYPE, PREFIX extends string = ''> =
  T extends C['LEAFTYPE']
    ? ''
    : PREFIX extends `${string}${C['LEAFKEY']}${string}`
      ? ''
      : ({[K in KeyOf<T>]-?: `${KeyToPath<K>}${_Path<NonNullable<T[K]>, C, `${PREFIX}${KeyToPathRaw<K>}`>}`}[KeyOf<T>] | '')

type EmptyAsNever<S extends string> = S extends '' ? never : S

export type Path<T, C extends CONFIGTYPE = DEFAULTCONFIG> = EmptyAsNever<_Path<T, C>>

type StringToKey<S> =
  S extends `${infer _ extends number}`
    ? number 
    : S extends `\$${infer N extends number}`
      ? `${N}`
      : S

type Nullable<T> = Exclude<T, NonNullable<T>>

type PathMatch<S> =
  S extends ''
    ? ['', '']
    : S extends `_${infer K}_${infer R}`
      ? [StringToKey<K>, `_${R}`]
      : S extends `_${infer K}`
        ? [StringToKey<K>, '']
        : never

type IsAtLeaf<P extends string, PREFIX extends string, C extends CONFIGTYPE> =
  P extends ''
    ? true
    : PREFIX extends `${string}${C['LEAFKEY']}${string}`
      ? true
      : false

type _PathSetType<T, P extends _Path<T, C>, C extends CONFIGTYPE, PREFIX extends string, READONLY extends boolean> =
  IsAtLeaf<P, PREFIX, C> extends true
    ? READONLY extends true ? never : T
    : PathMatch<P> extends [infer K, infer R]
        ? K extends KeyOf<NonNullable<T>>
          ? R extends _Path<NonNullable<T>[K], C>
            ? _PathSetType<NonNullable<T>[K], R, C, `${PREFIX}_${K}`, K extends ModifiableKeys<NonNullable<T>> ? false : true>
            : never
          : never
        : never

type _PathSetTypeDeepReadonly<T, P extends _Path<T, C>, C extends CONFIGTYPE, PREFIX extends string> =
  IsAtLeaf<P, PREFIX, C> extends true
    ? T
    : PathMatch<P> extends [infer K extends KEYTYPE, infer R]
        ? K extends ModifiableKeys<NonNullable<T>>
          ? R extends _Path<NonNullable<T>[K], C>
            ? _PathSetTypeDeepReadonly<NonNullable<T>[K], R, C, `${PREFIX}_${K}`>
            : never
          : never
        : never

export type PathSetType<T, P extends Path<T, C>, C extends CONFIGTYPE = DEFAULTCONFIG> =
  C['DEEPREADONLY'] extends true
    ? _PathSetTypeDeepReadonly<T, P, C, ''>
    : _PathSetType<T, P, C, '', false>

type _PathGetType<T, P extends _Path<T, C>, C extends CONFIGTYPE, NT, PREFIX extends string> = 
  IsAtLeaf<P, PREFIX, C> extends true
    ? NT | T
    : PathMatch<P> extends [infer K, infer R]
      ? K extends KeyOf<NonNullable<T>>
        ? R extends _Path<NonNullable<NonNullable<T>[K]>, C>
            ? _PathGetType<NonNullable<NonNullable<T>[K]>, R, C, NT | Nullable<T> | (K extends keyof T ? Nullable<T[K]> : never), `${PREFIX}_${K}`>
            : never
        : never
      : never

export type PathGetType<T, P extends Path<T, C>, C extends CONFIGTYPE = DEFAULTCONFIG> = _PathGetType<T, P, C, never, ''>

export type Pathable<T, C extends CONFIGTYPE = DEFAULTCONFIG, PREFIX extends string = '', NT = never> =
  T extends C['LEAFTYPE']
    ? (T | NT)
    : PREFIX extends `${string}${C['LEAFKEY']}${string}`
      ? (T | NT)
      : NT | {[K in keyof T]: Pathable<NonNullable<T[K]>, C, PREFIX, NT | Nullable<T[K]> | Nullable<T>>}

const splitPath = (p: string) => (p === '_') ? [] : p.substring(1).split('_').map(k => k.match(/^\$?(.*)$/)?.[1] ?? k)

const _getPath = (x: any, p: any[]) => {
  let target = x;
  for (const k of p) {
    if (target === null || target === undefined) {
        break;
    }
    target = target[k];
  }
  return target;
}

export const get = <T, C extends CONFIGTYPE = DEFAULTCONFIG>(x: T) => <P extends Path<T, C>>(p: P): PathGetType<T, P, C> => _getPath(x, splitPath(p))

const _set = (x: any, p: any[], v: any) => {
  let target = x;
  let key;

  // p is never empty
  for (const k of p) {
    const u = key ? target[key] : target;
    if (u === undefined || u === null) {
      return false;
    }
    key = k;
    target = u;
  }

  target[key] = v;
  return true;
}

export const set = <T, C extends CONFIGTYPE = DEFAULTCONFIG>(x: T) => <P extends Path<T, C>, V extends PathSetType<T, P, C>>(p: P, v: V): boolean => _set(x, splitPath(p), v)

// "anomalous" paths with different PathGetType and PathSetType
type AnomalousPath<T, C extends CONFIGTYPE = DEFAULTCONFIG> =
  {[K in Path<T, C>]:
    TypeEqual<PathGetType<T, K, C>, PathSetType<T, K, C>> extends false
      ? K
      : never
  }[Path<T, C>]

// path proxy type with readonly 'anomalous' paths
export type PathProxy<T, C extends CONFIGTYPE = DEFAULTCONFIG> =
  {[K in Exclude<Path<T, C>, AnomalousPath<T, C>>]: PathGetType<T, K, C>}
  &
  Readonly<{[K in AnomalousPath<T, C>]: PathGetType<T, K, C>}>

export type PathCallback<T, C extends CONFIGTYPE = DEFAULTCONFIG> = (kv: {[K in Path<T, C>]: [K, PathGetType<T, K, C>]}[Path<T, C>]) => void;

export const pathProxy = <T, C extends CONFIGTYPE = DEFAULTCONFIG, PROXY = PathProxy<T, C>>(
  x: T,
  options: {
    onSet?: PathCallback<T, C>,
    onSetError?: PathCallback<T, C>,
    onGet?: PathCallback<T, C>
  } = {}
) => {
  const { onSet, onSetError, onGet } = options;
  const getT = get<T, C>(x);
  const setT = set<T, C>(x);

  return new Proxy({}, {
    get: (_, prop) => {
      if (typeof prop === 'symbol') {
        return undefined;
      }
      const p = prop as Path<T, C>;
      const r = getT(p);
      onGet?.([p, r]);
      return r;
    },
    set: (_, prop, value) => {
      if (typeof prop === 'symbol') {
        return false;
      }
      const p = prop as Path<T, C>;
      const result = setT(p, value);
      if (result) {
        onSet?.([p, value]);
      } else {
        onSetError?.([p, value]);
      }
      return result;
    },
    deleteProperty: () => false
  }) as PROXY;
}
