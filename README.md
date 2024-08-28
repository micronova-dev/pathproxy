# PathProxy

This package contains generic object path types allowing type-safe get/set access to nested object properties using __path__ strings.  __Path__ strings use `_` (underscore) as the prefix/separator character; e.g.,, ```_a_b_c``` is used to accesss property `c` of nested type ```{ a: { b: { c: number }}}```.  A nullable ancestor makes all its descendents also nullable, and readonly properties cannot be set.  Custom path __leaves__ (where __paths__ end) can be specified either by path substrings or by property type.  __Path__ strings are valid javascript object keys, and a __PathProxy__ `x` can be used to allow expressions like `x._a_b_c = x._r`.

## Installation

To install:

```
yarn add micronova-dev/pathproxy
```

or
```
npm install micronova-dev/pathproxy
```

then import types and functions to use:

```
import type { 
  TypeEqual,
  ModifiableKeys,
  DEFAULTLEAFTYPE,
  PathConfigOption,
  PathConfig,
  Path,
  PathSetType,
  PathGetType,
  Pathable,
  PathProxy,
  PathCallback
} from 'pathproxy';

import {
  get,
  set,
  pathProxy
} from 'pathproxy';
```

## Path

A __path__ is a chain of object keys preceded and separated by `_` (underscore).  For example, for the following type:
```
type T = {
  a: {
    b: {
      c: number
    }
  }
}
```
its __path__ type (__Path\<T\>__) is:
```
"_a" | "_a_b" | "_a_b_c"
```

For arrays, `_0`, `_1`, etc. (`` `_${number}` `` [template literal type](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)) are used to access its elements (along with `_length`), and for [tuples](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types), `_$0`, `_$1`, etc. are used.  For example, for the following type:
```
type T = {
  a: number[], // array
  b: [string, number] // tuple
}
```
__Path\<T\>__ is:
```
"_a" | `_a_${number}` | "_a_length" | "_b" | "_b_$0" | "_b_$1"
```

This syntax is chosen so that __path__ strings can be used as valid javascript property names (e.g., as proxy keys).  The following keys are excluded from __Path__:

* empty string key ("")
* string keys containing "_" (underscore) or "$" (dollar) character

 e.g., for this type:
```
type T = {
  _a: number
  b$: string,
  x: {
    '': number,
    c: string
  }
}
```
__Path\<T\>__ is
```
"_x" | "_x_c"
```

## PathGetType and Nullability

For a __path__ `p` of __Path\<T\>__, its "get" value type is defined as __PathGetType\<T, p\>__ (this is the type of value that we "get" for the given __path__ `p`).  For example, for the following type:
```
type T = {
  a: {
    m: {
      b: number | null,
      c: string
    }
  }
}

```
__PathGetType\<T, p\>__ for each path p is:

| path | PathGetType |
| - | - |
| _a | { m: { b: number \| null, c: string } } |
| _a_m | { b: number \| null, c: string } |
| _a_m_b | number \| null |
| _a_m_c | string |

When an ancestor object needs to be nullable (undefined or null), __PathGetType__ for all paths going through it inherit nullability of the ancestor object.  For example, when property `m` needs to be nullable (undefined):
```
type T = {
  a: {
    m?: {
      b: number | null,
      c: string
    }
  }
}
```
__Path\<T\>__ remains the same but __PathGetType__ inherits nullability of `m` as follows (inherited type is in boldface):

| path | PathGetType |
| - | - |
| _a | { m?: { b: number \| null, c: string } } |
| _a_m | { b: number \| null, c: string } \| undefined |
| _a_m_b | number \| null \| __undefined__ |
| _a_m_c | string \| __undefined__ |

Also "null" gets inherited.  For example, for this type:

```
type T = {
  a: {
    m: {
      b: number | null,
      c: string
    } | null
  }
}
```

| path | PathGetType |
| - | - |
| _a | { m: { b: number \| null, c: string } \| null } |
| _a_m | { b: number \| null, c: string } \| null |
| _a_m_b | number \| null |
| _a_m_c | string \| __null__ |

When necessary, __Pathable</T\>__ explicitly adds all inherited nullability to T; e.g., for the following type:
```
type T = {
  a: {
    m?: {
      b: number | null,
      c: string
    }
  }
}

```
__Pathable\<T\>__ is:
```
{
  a: {
    m?: {
      b: number | null | undefined, // undefined inherited from m
      c: string | undefined // undefined inherited from m
    }
  }
}
```


## Path "Leaves"

Some types need to be self-referencing like this:

```
type T = {
  prev: T;
  next: T;
}
```

This makes __Path\<T\>__ explode (`"_next" | "_next_next" | "_next_next_next" | ...`), and in this case we need to control where __paths__ should stop (at __leaves__).  __Path\<T\>__ takes an optional __PathConfig__ argument to define custom "__leaves__", like __Path\<T, __PathConfig__\>__.

Paths can be defined as "__leaves__" by specifying matching substrings (__leafKey__); e.g., for type T above,
```
Path<T, PathConfig<{ LEAFKEY: "next" | "prev" }>>
```
defines all paths matching "next" or "prev" substring  as__leaves__, so this becomes:
```
"_next" | "_prev"
```
__LeafKey__ is set to __never__ by default, and may include strings with special characters like "_", "$", "\{", or "\}".  For example,
```
Path<T, PathConfig<{ LEAFKEY: "next_next" | "prev" }>>
```
becomes
```
"_next" | "_prev" | "_next_next" | "_next_prev"

```
and the following defines all array elements as __leaves__:
```
Path<{
  x: { p: number, q: string}[],
  y: { r: string }[]
}, PathConfig<{ LEAFKEY: '${number}' }>>

```
so this is the same as:
```
"_x" | "_x_length" | `_x_${number}` | "_y" | "_y_length" | `_y_${number}`
```

It is also possible to define __leaves__ by type by setting __LEAFTYPE__ of __PathConfig__.  By default, the following types are treated as "__leaves__":
```
export DEFAULTLEAFTYPE = number | string | boolean | symbol | Function | Date | BigInt | RegExp;
```
Note that non-primitive types like __Date__ is treated as a __leaf__ by default (even though __Date__ is an object type with properties like "getYear", etc.).

To use custom type as __LEAFTYPE__, define __PathConfig__ as follows:
```
Path<
  {
    a: {
      b: number
    },
    c: {
      x: number
    }
  },
  PathConfig<{ LEAFTYPE: DEFAULTLEAFTYPE | { x: number }}
>
```
then "c" becomes a __leaf__ and Z is the same as:
```
"_a" | "_c" | "_a_b"
```
Note that __Path__ of a __leaf__ type is always __never__; e.g., the following are __never__:
```
Path<DEFAULTLEAFTYPE>

Path<{ x: number }, PathConfig<{ LEAFTYPE: { x: number } }>
```

## PathSetType and readonly

For a __path__ `p` of __Path\<T\>__,  __PathSetType\<T, p\>__ is the type of value that can be used to "set" it.  This type is the same as raw property type (without inherited nullability of __PathGetType\<T, p\>__), and is set to __never__ for "readonly" properties (so __PathSetType__ extends __PathGetType__). For example, for the following type:

```
type T = {
  a: {
    readonly m?: {
      b: number | null,
      c: string
    }
  }
}

```

| path | PathSetType\<T, path\> |
| - | - |
| _a | { readonly m?: { b: number \| null, c: string } } |
| _a_m | __never__ |
| _a_m_b | number \| null |
| _a_m_c | string |

When necessary, it is possible to treat "readonly" attribute in a "deep" manner (making all descendents of a "readonly" property also "readonly") by using __PathSetType<T, path, PathConfig<{ DEEPREADONLY: true }>>__:

| path | PathSetType<T, path, PathConfig<{ DEEPREADONLY: true }>> |
| - | - |
| _a | { readonly m?: { b: number \| null, c: string } } |
| _a_m | __never__ |
| _a_m_b | __never__ |
| _a_m_c | __never__ |

Note that actual "set" operation is supposed to fail if any ancestor is undefined or null at runtime.

In this document a __path__ is called "anomalous" if its __PathGetType__ is not equal to __PathSetType__.

## get/set

__Path__ package exports the following type-safe get/set functions:

For a type T, `get(t: T)` returns a function that takes a __Path\<T\>__ `p` and returns its value of __PathGetType\<T, p\>__; i.e., `get(t)(p)` is the value of path `p` in object `t`.  Note that `get(t)(p)` returns the top-most nullable ancestor value (undefined or null) for a path going through a nullable ancestor; for example:
```
type T = {
  a?: {
    b: {
      c: string;
    } | null
  }
}

const t1: T = {}
const t2: T = {a: { b: null }}

// x1 is undefined because a is undefined
const x1 = get(t1)('_a_b_c');
// x2 is null because a is defined but b is null
const x2 = get(t2)('_a_b_c');
```

`set(t: T)` returns a function that takes a __Path\<T\>__ `p` and a value `v` of __PathSetType\<T, p\>__ and returns true if `p`'s value is successfully set to `v`, or false otherwise (e.g., when an ancestor object is nullable); i.e., `set(t)(p, v)` returns true if successfully set, or false otherwise.

For example:
```
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

// this is type error (_b is readonly)
setT('_b', 'abcd');

// this is 'ok'
getT('_b');

// this is [1, 2, 3]
getT('_c')

// this returns true
setT('_c_0', 6);

// this is now [6, 2, 3]
getT('_c')

// this is undefined because _a is undefined
getT('_a_p')

// this is error and returns false (_a is undefined)
setT('_a_p', 6);

// this returns true
setT('_a', { p: 9 });

// this returns 9 now
getT('_a_p')

// this returns true
setT('_a_p', 6);

// this returns { p: 6 }
getT('_a');

```

When a __PathConfig__ C needs to be speficied, `get<T, C>(t: T)` or `set<T, C>(t: T)` can be used.

## PathProxy

__Paths__ can be used as javascript object keys, so it is possible to use __paths__ as keys of a javascript proxy (__PathProxy__\<T\>) to enable __path__-based get/set access such as `proxy._a_b_c = proxy._x_y + 3`.  Since __PathGetType__ and __PathSetType__ can be different (by nullablity/readonly) and javascript proxy does not distinguish "get" properties from "set" properties, __PathProxy__ treats all "anomalous" paths (with different __PathGetType__ and __PathSetType__) to be "readonly".  For example:
```
PathProxy<{
  a: {
    readonly b: number,
    c: boolean
  }
}>
```
is the same as
```
{
  _a: {
    readonly b: number,
    c: boolean
  },
  _a_c: boolean
} & {
  readonly _a_b: number
}
```
and with a nullable ancestor:
```
PathProxy<{
  a?: {
    readonly b: number,
    c: boolean
  }
}>
```
is the same as:
```
{
  _a: {
    readonly b: number,
    c: boolean
  } | undefined
} & {
  readonly _a_c: boolean | undefined
  readonly _a_b: number | undefined
}
```

When necessary, __Pathable\<T\>__ returns T with all nullablity explicitly inherited, so:
```
PathProxy<Pathable<{
  a?: {
    readonly b: number,
    c: boolean
  }
}>>
```
is the same as:
```
PathProxy<{
  a?: {
    readonly b: number | undefined,
    c: boolean | undefined
  }
}>
```
and this is the same as:
```
{
  _a: {
      readonly b: number | undefined;
      c: boolean | undefined;
  } | undefined;
  _a_c: boolean | undefined;
} & { 
  readonly _a_b: number | undefined;
}
```
To create a __PathProxy__ proxy object, use __pathProxy\<T, C = PathConfig\>(t: T)__ function:
```
const t = {
  a: 
    b: 3,
    c: true
  },
  d: {
    r: 'xy'
  }
};

// using inferred type of t
const proxy = pathProxy(t);
```
then
```
// sets _a_b to length of 'xy' = 2
proxy._a_b = proxy._d_r.length;
```

__pathProxy()__ takes an optional argument with __onSet__/__onSetError__/__onGet__ callback functions.  For example,
```
type T = {
  a: number,
  b?: {
    c?: number
  }
}

const onGet = (p, v) => console.log(`GET ${p} = ${v}`);
const onSet = (p, v) => console.log(`SET ${p} TO ${v}`);
const onSetError = (p, v) =>  console.log(`SET ERROR ${p} TO ${v})`);

const proxy = pathProxy({ a: 0 } as T, { onGet, onSet, onSetError });
```
then
```
proxy._a = proxy._a + 1;
proxy._b_c = proxy._a + 1; // this throws exception
```
prints the following in the console before throwing an exception:

```
GET _a = 0
SET _a TO 1
GET _a = 1
SET ERROR _b_c TO 2
```

__PathProxy__ only supports "get"/"set" operations ("set to undefined" is to be used as "delete").

When __PathConfig__ C needs to be set,
```
const proxy = pathProxy<T, C>(x)
``` 
can be used.

## Exports

This module exports the following types:

|type|description|
|-|-|
|TypeEqual<X, Y>|true if X and Y are equal (including readonly), false otherwise; currently derived from [this post](https://github.com/microsoft/TypeScript/issues/27024)|
|ModifiableKeys\<T\>|modifiable (non-readonly) keys of T|
|DEFAULTLEAFTYPE|Default leaf type defined as `number \| string \| boolean \| symbol \| Function \| Date \| BigInt \| RegExp`|
|PathConfigOption = {LEAFKEY?: string \| never, LEAFTYPE?: unknown, DEEPREADONLY?: boolean}|Path configuration option to override default = { LEAFKEY: never, LEAFTYPE: DEFAULTLEAFTYPE, DEEPREADONLY: false}|
|PathConfig\<PathConfigOptions = {}>|Path configuration with given PathConfigOptions|
|Path\<T\, C = PathConfig\>|paths for type T, with optional PathConfig C|
|PathGetType\<T, path, C = PathConfig\>|"get" type of a path for type T, with optional PathConfig C|
|PathSetType\<T, path, C = PathConfig\>|"set" type of a path for type T, with optional PathConfig C|
|Pathable<T, C = PathConfig>|T with explict inherited nullability|
|PathProxy\<T, C = PathConfig\>|proxy type mapping path p of Path\<T, C\> to PathGetType<T, p, C>, marking "anomalous" paths as "readonly"|
|PathCallback\<T, C = PathConfig\>|get/set/setError callback function type ([p, v]) => void with Path/PathGetType pair [p, v]|

and the following functions:

|function|description|
|-|-|
|<T, C = PathConfig>get(x: T) => p: Path<T, C> => PathGetType<T, typeof p, C>|path "get" function|
|<T, C = PathConfig>set(x: T) => (p: Path<T, C>, v: PathSetType<T, typeof p, C>) => boolean|path "set" function, returns true if successful, false otherwise|
|<T, C = PathConfig>pathProxy(x: T, options: {onSet?: PathCallback<T, C>, onSetError?: PathCallback<T, C>, onGet?: PathCallback<T, C>} = {}) => PathProxy<T, C>|returns PathProxy object for x|


