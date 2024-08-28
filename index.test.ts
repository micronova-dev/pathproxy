import type { Path, PathGetType, PathSetType, TypeEqual, PathConfig, DEFAULTLEAFTYPE, Pathable, PathProxy, PathCallback } from './index';
import { get , set, pathProxy } from './index'

const expectTypeEqual = <T, U>(x: TypeEqual<T, U>) => x;

describe('path', () => {
  test('Path', () => {
    expectTypeEqual<
      Path<
        {
          a: {
            b: {
              c: number
            }
          }
        }
      >,
      "_a" | "_a_b" | "_a_b_c"
    >(true);

    expectTypeEqual<
      Path<
        {
          a: number[], // array
          b: [string, number] // tuple
        }
      >,
      "_a" | `_a_${number}` | "_a_length" | "_b" | "_b_$0" | "_b_$1"
    >(true);

    expectTypeEqual<
      Path<
        {
          _a: number
          b$: string,
          x: {
            '': number
            c: string
          }
        }
      >,
      "_x" | "_x_c"
    >(true)
  });

  test("Path with LEAFKEY", () => {
    type T = {
      next: T,
      prev: T
    }

    expectTypeEqual<
      Path<
        T,
        PathConfig<{ LEAFKEY: "next" | "prev" }>
      >,
      "_next" | "_prev"
    >(true);

    expectTypeEqual<
      Path<
        T,
        PathConfig<{ LEAFKEY: "next_next" | "prev" }>
      >,
      "_next" | "_prev" | "_next_next" | "_next_prev"
    >(true);

    expectTypeEqual<
      Path<
        {
          x: { p: number, q: string}[],
          y: { r: string }[]
        },
        PathConfig<{ LEAFKEY: '${number}' }>
      >,
      "_x" | "_x_length" | `_x_${number}` | "_y" | "_y_length" | `_y_${number}`
    >(true);
  });

  test("Path with LEAFTYPE", () => {
    expectTypeEqual<
      Path<
        {
          a: {
            b: number
          },
          c: {
            x: number
          }
        },
        PathConfig<{ LEAFTYPE: DEFAULTLEAFTYPE | { x: number } }>
      >,
      "_a" | "_c" | "_a_b"
    >(true);
  });

  test('PathGetType', () => {
    type T = {
      a: {
        m: {
          b: number | null,
          c: string
        }
      }
    };
    
    expectTypeEqual<
      PathGetType<T, '_a'>,
      { m: { b: number | null, c: string } }
    >(true);
    expectTypeEqual<PathGetType<T, '_a_m'>, { b: number | null, c: string }>(true);
    expectTypeEqual<PathGetType<T, '_a_m_b'>, number | null>(true);
    expectTypeEqual<PathGetType<T, '_a_m_c'>, string>(true);
  });
  test('PathGetType with undefined ancestors', () => {
    type T = {
      a: {
        m?: {
          b: number | null,
          c: string
        }
      }
    };

    expectTypeEqual<
      PathGetType<T, '_a'>,
      { m?: { b: number | null, c: string } }
    >(true);
    expectTypeEqual<PathGetType<T, '_a_m'>, { b: number | null, c: string } | undefined>(true);
    expectTypeEqual<PathGetType<T, '_a_m_b'>, number | null | undefined>(true);
    expectTypeEqual<PathGetType<T, '_a_m_c'>, string | undefined>(true);
  });

  test('PathGetType with null ancestors', () => {
    type T = {
      a: {
        m: {
          b: number | null,
          c: string
        } | null
      }
    };

    expectTypeEqual<
      PathGetType<T, '_a'>,
      { m: { b: number | null, c: string } | null }
    >(true);
    expectTypeEqual<PathGetType<T, '_a_m'>, { b: number | null, c: string } | null>(true);
    expectTypeEqual<PathGetType<T, '_a_m_b'>, number | null>(true);
    expectTypeEqual<PathGetType<T, '_a_m_c'>, string | null>(true);
  });
  test('PathSetType', () => {
    type T = {
      a: {
        readonly m?: {
          readonly b: number | null,
          c: string
        }
      }
    };

    expectTypeEqual<
      PathSetType<T, '_a'>,
      { readonly m?: { readonly b: number | null, c: string } }
    >(true);
    expectTypeEqual<PathSetType<T, '_a_m'>, never>(true);
    expectTypeEqual<PathSetType<T, '_a_m_b'>, never>(true);
    expectTypeEqual<PathSetType<T, '_a_m_c'>, string>(true);
  });

  test('PathSetType with DEEPREADONLY', () => {
    type T = {
      a: {
        readonly m?: {
          readonly b: number | null,
          c: string
        }
      }
    };

    type DEEP = PathConfig<{ 'DEEPREADONLY': true }>

    expectTypeEqual<
      PathSetType<T, '_a', DEEP>,
      { readonly m?: { readonly b: number | null, c: string } }
    >(true);
    expectTypeEqual<PathSetType<T, '_a_m', DEEP>, never>(true);
    expectTypeEqual<PathSetType<T, '_a_m_b', DEEP>, never>(true);
    expectTypeEqual<PathSetType<T, '_a_m_c', DEEP>, never>(true);
  });

  test('get/set', () => {
    type T = {
      a?: {
        p: number,
        q: [string, boolean] | null,
      },
      readonly b: string,
      c: number[]
    }

    const t: T = {
      b: 'ok',
      c: [1, 2, 3]
    };
    
    const getT = get(t);
    const setT = set(t);

    if (false) {
      // @ts-expect-error: path is invalid
      const f = getT('_p')
      // @ts-expect-error: no _length for tuples
      getT('_a_q_length')
      // @ts-expect-error: value is string, not number
      const e: number  = getT('_b')
      // @ts-expect-error: can only set number, not string
      const g = setT('_c', 'ab')
      // @ts-expect-error: can't set readonly
      setT('_b', 'abcd')
    }

    expect(getT('_b')).toBe('ok');
    expect(getT('_c')).toEqual([1, 2, 3]);

    expect(getT('_c_length')).toBe(3);
    expect(setT('_c_0', 6)).toBe(true);
    expect(getT('_c_0')).toBe(6);

    // array manipulation

    expect(setT('_c_4', 7)).toBe(true);
    expect(getT('_c')).toEqual([6, 2, 3, undefined, 7]);
    expect(setT('_c_length', 2)).toBe(true);
    expect(getT('_c')).toEqual([6, 2]);

    // set with undefined ancestor _a

    expect(getT('_a_p')).toBe(undefined);
    expect(setT('_a_p', 3)).toBe(false);
    expect(getT('_a_p')).toBe(undefined);

    // set _a to be non-nullable

    expect(setT('_a', { p: 2, q: null})).toBe(true);   
    expect(getT('_a_p')).toBe(2);
    expect(setT('_a_p', 4)).toBe(true);
    expect(getT('_a_p')).toBe(4);

    // _a_q is null

    expect(getT('_a_q')).toBe(null);
    expect(getT('_a_q_$0')).toBe(null);
    expect(setT('_a_q_$0', 'ijk')).toBe(false);
    expect(getT('_a_q')).toBe(null);
    expect(getT('_a_q_$0')).toBe(null);

    // set q

    expect(setT('_a_q', ['ggg', false])).toBe(true);
    expect(getT('_a_q_$0')).toBe('ggg');
    expect(getT('_a_q_$1')).toBe(false);
    expect(setT('_a_q_$1', true)).toBe(true);
    expect(getT('_a_q_$1')).toBe(true);
  });

  test('get/set with config', () => {
    type T = {
      prev?: T,
      next?: T,
      value: string
    }

    const x: T = { value: 'abc' };
    
    type C = PathConfig<{ LEAFKEY: 'next' | 'prev' }>

    const getT = get<typeof x, C>(x);
    const setT = set<typeof x, C>(x);

    if (false) {
      // @ts-expect-error: no '_next_next'
      expect(getT('_next_next')).toBe(undefined);
    }
    expect(getT('_value')).toBe('abc')
    expect(setT('_value', 'pqr')).toBe(true);
    expect(getT('_value')).toBe('pqr');
    expect(setT('_next', { value: 'stu', prev: x })).toBe(true);
  });

  test('PathProxy', () => {
    // only readonly
    expectTypeEqual<
      PathProxy<{
        a: {
          readonly b: number,
          c: boolean
        }
      }>,
      {
        _a: {
          readonly b: number,
          c: boolean
        },
        _a_c: boolean
      } & {
        readonly _a_b: number
      }
    >(true);

    // nullable ancestor
    expectTypeEqual<
      PathProxy<{
        a?: {
          readonly b: number,
          c: boolean
        }
      }>,
      {
        _a: {
          readonly b: number,
          c: boolean
        } | undefined
      } & {
        readonly _a_c: boolean | undefined
        readonly _a_b: number | undefined
      }
    >(true);

    // with Pathable
    expectTypeEqual<
      PathProxy<Pathable<{
        a?: {
          readonly b: number,
          c: boolean
        }
      }>>,
      {
        _a: {
            readonly b: number | undefined;
            c: boolean | undefined;
        } | undefined;
        _a_c: boolean | undefined;
      } & { 
        readonly _a_b: number | undefined;
      }
    >(true);
  });

  test('pathProxy', () => {
    // similar to "get/set" test
    type T ={
      a?: {
        p: number,
        q: [string, boolean] | null,
      },
      readonly b: string,
      c: number[]
    }

    const t: T = {
      b: 'ok',
      c: [1, 2, 3]
    };

    const onSet = jest.fn();
    const onSetError = jest.fn();
    const onGet = jest.fn();
  
    const proxy = pathProxy(t, { onSet, onSetError, onGet });

    if (false) {
      // @ts-expect-error: path is invalid
      proxy._p;
      // @ts-expect-error: no _length for tuples
      proxy._a_q_length;
      // @ts-expect-error: value is string, not number
      const e: number = proxy._b;
      // @ts-expect-error: can only set number, not string
      proxy._c = 'ab';
      // @ts-expect-error: readonly
      proxy._b = 'abcd';
      // @ts-expect-error: different get/set type, readonly
      proxy._a_p = 6;
      // @ts-expect-error: different get/set type, readonly
      proxy._a_q_$0 = 'ggg';
    }

    expect(proxy._c).toEqual([1, 2, 3]);

    expect(proxy._c_length).toBe(3);
    expect(onGet).toHaveBeenCalledWith(['_c_length', 3]);

    proxy._c_0 = 6;
    expect(proxy._c_0).toBe(6);
    expect(onSet).toHaveBeenCalledWith(['_c_0', 6]);

    proxy._c_4 = 7;
    expect(proxy._c).toEqual([6, 2, 3, undefined, 7]);
    expect(onSet).toHaveBeenCalledWith(['_c_4', 7]);

    proxy._c_length = 2;
    expect(proxy._c).toEqual([6, 2]);
    expect(onSet).toHaveBeenCalledWith(['_c_length', 2]);

    expect(proxy._a_p).toBe(undefined);

    proxy._a = { p: 2, q: null};
    expect(onSet).toHaveBeenCalledWith(['_a', { p: 2, q: null }]);
    expect(proxy._a_p).toBe(2);

    expect(proxy._a_q).toBe(null);
    expect(proxy._a_q_$0).toBe(null);
    expect(onGet).toHaveBeenCalledWith(['_a_q_$0', null]);

    proxy._a = { p: 12, q: ['ggg', false] };
    expect(proxy._a_q_$0).toBe('ggg');
    expect(proxy._a_q_$1).toBe(false);
    expect(proxy._a_p).toBe(12);
    expect(onSet).toHaveBeenCalledWith(['_a', { p: 12, q: ['ggg', false] }]);

    expect(onGet).toHaveBeenCalledTimes(12);
  });

  test('pathProxy with Pathable', () => {
    // similar to "get/set" test, but nullability is explicitly inherited
    // using Pathable so that only readonly path is '_b'
    type T = Pathable<{
      a?: {
        p: number,
        q: [string, boolean] | null,
      },
      readonly b: string,
      c: number[]
    }>

    const t: T = {
      b: 'ok',
      c: [1, 2, 3]
    };

    const onSet = jest.fn();
    const onSetError = jest.fn();
    const onGet = jest.fn();
  
    const proxy = pathProxy(t, { onSet, onSetError, onGet });

    if (false) {
      // @ts-expect-error: path is invalid
      proxy._p;
      // @ts-expect-error: no _length for tuples
      proxy._a_q_length;
      // @ts-expect-error: value is string, not number
      const e: number = proxy._b;
      // @ts-expect-error: can only set number, not string
      proxy._c = 'ab';
      // @ts-expect-error: can't set readonly
      proxy._b = 'abcd';
      // @ts-expect-error: wrong type
      proxy._a_p = null;
    }

    expect(proxy._c).toEqual([1, 2, 3]);

    expect(proxy._c_length).toBe(3);
    proxy._c_0 = 6;
    expect(proxy._c_0).toBe(6);

    // array manipulation

    proxy._c_4 = 7;
    expect(proxy._c).toEqual([6, 2, 3, undefined, 7]);
    proxy._c_length = 2;
    expect(proxy._c).toEqual([6, 2]);

    // set with undefined ancestor _a

    expect(proxy._a_p).toBe(undefined);

    expect(onGet).toHaveBeenCalledTimes(6);
    expect(onSet).toHaveBeenCalledTimes(3);

    expect(() => {proxy._a_p = 3;}).toThrow();
    expect(proxy._a_p).toBe(undefined);

    expect(onGet).toHaveBeenCalledTimes(7);
    expect(onSet).toHaveBeenCalledTimes(3);

    // set _a to be non-nullable

    proxy._a = { p: 4, q: undefined };
    expect(proxy._a_p).toBe(4);
    proxy._a_p = undefined;
    expect(proxy._a_p).toBe(undefined);

    // _a_q inherits undefined

    expect(proxy._a_q).toBe(undefined);
    expect(proxy._a_q_$0).toBe(undefined);

    expect(() => {proxy._a_q_$0 = 'ijk';}).toThrow();
    expect(proxy._a_q).toBe(undefined);
    expect(proxy._a_q_$0).toBe(undefined);

    // set q

    proxy._a_q = [undefined, undefined];
    expect(proxy._a_q_$0).toBe(undefined);
    expect(proxy._a_q_$1).toBe(undefined);
    proxy._a_q = ['ggg', false];
    expect(proxy._a_q_$0).toBe('ggg');
    expect(proxy._a_q_$1).toBe(false);
    proxy._a_q_$1 = null;
    expect(proxy._a_q_$1).toBe(null);
  });

  test('pathProxy callbacks', () => {
    type T = {
      a: number,
      b?: {
        c?: number
      }
    }

    const calls: [string, ...Parameters<PathCallback<T>>[0]][] = [];

    const onGet: PathCallback<T> = (x) => calls.push(['get', ...x]);
    const onSet: PathCallback<T> = (x) => calls.push(['set', ...x]);
    const onSetError: PathCallback<T> = (x) => calls.push(['error', ...x]);

    const proxy = pathProxy({ a: 0 } as T, { onGet, onSet, onSetError });

    proxy._a = proxy._a + 1;
    expect(() => { proxy._b_c = proxy._a + 1 }).toThrow();

    expect(calls).toEqual([
      ['get', '_a', 0],
      ['set', '_a', 1],
      ['get', '_a', 1],
      ['error', '_b_c', 2]
    ]);
  });

  test('get/set simple', () => {
    type T = {
      a?: {
        p: number
      },
      readonly b: string,
      c: number[]
    }
    
    const t: T = {
      b: 'ok',
      c: [1, 2, 3]
    };
    
    const getT = get(t);
    const setT = set(t);

    if (false) {
      // @ts-expect-error: this is error (_b is readonly)
      setT('_b', 'abcd');
    }
    
    // this is 'ok'
    expect(getT('_b')).toBe('ok');
    
    
    // this is [1, 2, 3]
    expect(getT('_c')).toEqual([1, 2, 3]);
    
    // this returns true
    expect(setT('_c_0', 6)).toBe(true);
    
    // this is now [6, 2, 3]
    expect(getT('_c')).toEqual([6, 2, 3])
    
    // this is undefined because _a is undefined
    expect(getT('_a_p')).toBe(undefined);
    
    // this is error and returns false (_a is undefined)
    expect(setT('_a_p', 6)).toBe(false);
    
    // set _a to non-nullable
    expect(setT('_a', { p: 9 })).toBe(true);
    
    // this is 9 now
    expect(getT('_a_p')).toBe(9);
    
    // this returns true
    expect(setT('_a_p', 6)).toBe(true);

    // this returns { p: 6 }
    expect(getT('_a')).toEqual({ p: 6 });

  })
})
