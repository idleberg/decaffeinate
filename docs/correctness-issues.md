# How decaffeinate approaches correctness

The goal of decaffeinate is to convert CoffeeScript code to JavaScript in a way
that is 100% correct on *all reasonable code*. Within that constraint,
decaffeinate tries to make the resulting JS as high-quality as possible.
Focusing on correctness is tricky because sometimes the only solution is to make
all code a little uglier, like wrapping expressions in `Array.from`. That means
that each edge case needs to be carefully considered, and ideally only hurts
average-case code quality if absolutely necessary and the issue actually comes
up in reasonable code.

So what is *reasonable* code? If decaffeinate introduces one bug per 5,000
lines, then converting a 100,000 line project will introduce 20 new bugs *in
random places*, which is probably unacceptable. But other issues seem so rare
that they are unlikely to come up in a million lines of real-world code, and
likely aren't worth sacrificing code quality for.

**decaffeinate strives to be fully correct in these situations:**
* Production code in any popular CoffeeScript project.
* Cases that can be fixed without causing typical code to look worse.
* Code that seems like it might come up in the real world and would cause
  correctness issues that are difficult to detect.

**decaffeinate may not be fully correct in these situations:**
* Test cases in the CoffeeScript test suite. While the vast majority of these
  test cases can be handled by decaffeinate, some of them exercise edge cases in
  the language that seem to never occur in other projects.
* Other contrived examples that do not come up in the real world.

## Known correctness issues

This is a partial list of identified correctness issues which are causing
failures in the CoffeeScript test suite but are out of scope to fix for
decaffeinate. However, if you have real-world code running into one of these
issues and you think decaffeinate should be handling it, feel free to file an
issue to discuss.

### Classes cannot be called without `new`

decaffeinate always produces JavaScript `class` declarations, which are more
restrictive in that they *must* be used as a constructor, not a normal function.
For example, here's some code that prints "undefined" in CoffeeScript, but
crashes after decaffeinate:

```coffee
class A
console.log A()
```

This affects "ensure that constructors invoked with splats return a new object"
test in the CoffeeScript test suite.

### Fat arrow functions cannot be called with `new`

decaffeinate usually turns fat-arrow CoffeeScript functions into JavaScript
arrow functions. Arrow functions in JavaScript throw an exception when called
with `new` (although not with Babel), since it doesn't make sense for them to be
used as a constructor, whereas CoffeeScript allows it. For example, this code
does not crash in CoffeeScript or after decaffeinate and Babel, but crashes
after decaffeinate when run in a modern JS implementation:

```coffee
new =>
```

This affects "`new` works against bare function" test in the CoffeeScript test
suite.

### Static property inheritance is implemented differently

CoffeeScript implements inheritance for static properties by copying all
properties from the superclass to the subclass when the subclass is created.
The JavaScript `class` syntax instead uses prototypes to accomplish this.
These mechanisms usually behave the same, but operations involving own
properties of the class may behave differently.

Here's one example of where the behavior differs. The code prints "true" in
CoffeeScript, and prints "false" after decaffeinate:

```coffee
class A
  @x: -> 1
class B extends A
console.log B.hasOwnProperty 'x'
```

This affects the "Overriding the static property new doesn't clobber
Function::new" test in the CoffeeScript test suite.

### Subclassing built-ins is allowed in different situations

Subclassing built-ins like `Array` is difficult to do reliably in ES5. In
CoffeeScript, it usually works if the class has a constructor, but not if it
does not specify one. Babel disallows this case by default to avoid more subtle
correctness issues, and in modern JavaScript, it is always allowed using `class`
syntax.

The [babel-plugin-transform-builtin-extend](https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend)
Babel plugin may help if you're trying to enable this behavior in Babel.

Here's one example of where the behavior differs. The code prints "true" in
CoffeeScript, "false" when running through decaffeinate and Babel, and "true"
when run through decaffeinate and executed in a modern JS implementation:

```coffee
class A extends Array
  constructor: -> super
console.log new A() instanceof A
```

This affects the "extending native objects that use other typed constructors
requires defining a constructor" test in the CoffeeScript test suite.

### Executable class bodies can have their statements reordered

When class bodies have non-method statements, all of them are grouped (in order)
into a function called `initClass` that runs immediately after the class is
declared. This means that all methods will be on the class prototype when
non-method code is run, and all variables declared in the class body will be in
scope for all methods, which is usually desirable, but causes some CoffeeScript
test failures.

Here is some code that prints "Exists? false" in CoffeeScript and "Exists? true"
after decaffeinate:

```coffee
class A
  console.log "Exists? #{@prototype.b?}"
  b: ->
    c
```

This affects the "variables in constructor bodies are correctly scoped" test in
the CoffeeScript test suite.

### `undefined in arr` returns `true` for sparse arrays without explicit `undefined`s

The `in` operator is converted to `Array.from` followed by
`Array.prototype.includes`, so if the array was a sparse array, it will have
`undefined` values, even if the original array did not. For example, this code
prints "false" in CoffeeScript and "true" after decaffeinate.

```coffee
console.log undefined in {length: 1}
```

Generally, sparse arrays and doing an existence check on `undefined` both seem
quite rare, so it seems not worth changing the common case to account for this.

This affects the "`in` should check `hasOwnProperty`" test in the CoffeeScript
test suite.

### Side-effects in `valueOf` and getters may be called multiple times

In the past, CoffeeScript has generally assumed that property accesses like
`a.b` and value coercions like `+a` can be run multiple times without worry of
side-effects, even though technically getters and `valueOf` can make these
operations unsafe to repeat. However, newer versions of CoffeeScript are safe in
these cases. See these discussions for more info:

https://github.com/jashkenas/coffeescript/commit/c056c93e19f4b8d55f06371b38efe9926744d484#commitcomment-384593
https://github.com/jashkenas/coffeescript/issues/3598

To avoid ugly intermediate variables, decaffeinate assumes that these operations
may be safely repeated. For example, this code prints one of each statement in
CoffeeScript and two of each statement after decaffeinate.

```
a = {valueOf: -> console.log 'Called valueOf'}
Object.defineProperty(a, 'b', {
  get: ->
    console.log 'Called get'
    1
})
x = a.b ? 2
y = +a ? 3
```

This affects the "Unary + and - coerce the operand once when it is an
identifier" test in the CoffeeScript test suite.

### Globals like `Object` and `Array` may be accessed by name from generated code

For example, this code will fail after decaffeinate because `for own` results in
code using `Object.keys`:

```
Object = 1
for own k of {b: 1, c: 2}
  console.log k
```

babel also does not protect against these cases, so it seems reasonable for
decaffeinate to skip them as well.

This affects a number of tests in the `scope.coffee` file in the CoffeeScript
test suite.