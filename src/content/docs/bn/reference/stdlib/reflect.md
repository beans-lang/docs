---
title: std.reflect
description: runtime-এ type, member, annotation, value, construction, আর call-এর descriptor।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 7 package functions · 18 types · 94 instance methods · 40 enum variants.
<!-- coverage:summary:end -->

`std.reflect` নিরাপদ runtime metadata আর checked dynamic action দেয়। উদাহরণ,
ownership-এর নিয়ম, আর সীমাবদ্ধতা জানতে দেখুন
[reflection guide](/bn/guide/reflection/)।

```beans
import std.reflect
```

## Registry function

```beans
pub fn value<T>(move item: T) -> Value
pub fn types() -> List<Type>
pub fn find_type(qualified_name: string) -> Option<Type>
pub fn functions() -> List<Function>
pub fn find_function(qualified_name: string) -> Option<Function>
pub fn annotation_types() -> List<AnnotationType>
pub fn find_annotation_type(qualified_name: string) -> Option<AnnotationType>
```

কম্পাইল টাইমে জানা কোনো type-এর জন্য contextual `type_of(T)` builtin ব্যবহার করুন।

## Type আর member descriptor

```beans
pub class Type
pub fn qualified_name() -> string
pub fn name() -> string
pub fn kind() -> Kind
pub fn type_arguments() -> List<Type>
pub fn base_type() -> Option<Type>
pub fn interfaces() -> List<Type>
pub fn is_assignable_from(other: Type) -> bool
pub fn declared_fields() -> List<Field>
pub fn fields() -> List<Field>
pub fn field(name: string) -> Option<Field>
pub fn declared_methods() -> List<Method>
pub fn methods() -> List<Method>
pub fn method(name: string) -> Option<Method>
pub fn initializer() -> Option<Initializer>
pub fn variants() -> List<Variant>
pub fn annotations() -> List<Annotation>
pub fn variant(name: string) -> Option<Variant>
```

```beans
pub class Field
pub fn name() -> string
pub fn type() -> Type
pub fn declaring_type() -> Type
pub fn is_public() -> bool
pub fn has_default() -> bool
pub fn get(receiver: Value) -> Result<Value, ReflectError>
pub fn set(receiver: Value, move value: Value) -> Result<bool, ReflectError>
pub fn annotations() -> List<Annotation>
```

```beans
pub class Method
pub fn name() -> string
pub fn declaring_type() -> Type
pub fn result_type() -> Type
pub fn is_public() -> bool
pub fn is_static() -> bool
pub fn is_generic() -> bool
pub fn parameters() -> List<Parameter>
pub fn call(receiver: Value, move arguments: List<Value>) -> Result<Value, ReflectError>
pub fn call_static(move arguments: List<Value>) -> Result<Value, ReflectError>
pub fn annotations() -> List<Annotation>
```

```beans
pub class Initializer
pub fn declaring_type() -> Type
pub fn is_public() -> bool
pub fn is_generic() -> bool
pub fn parameters() -> List<Parameter>
pub fn annotations() -> List<Annotation>
pub fn call(move arguments: List<Value>) -> Result<Value, ReflectError>
```

```beans
pub class Variant
pub fn name() -> string
pub fn declaring_type() -> Type
pub fn parameters() -> List<Parameter>
pub fn annotations() -> List<Annotation>
pub fn make(move arguments: List<Value>) -> Result<Value, ReflectError>
```

```beans
pub class Function
pub fn qualified_name() -> string
pub fn name() -> string
pub fn result_type() -> Type
pub fn is_public() -> bool
pub fn is_generic() -> bool
pub fn parameters() -> List<Parameter>
pub fn call(move arguments: List<Value>) -> Result<Value, ReflectError>
pub fn annotations() -> List<Annotation>
```

```beans
pub class Parameter
pub fn name() -> string
pub fn type() -> Type
pub fn passing() -> Passing
pub fn annotations() -> List<Annotation>
```

## Dynamic value

```beans
pub class Value
pub fn type() -> Type
pub fn copy() -> Value
pub fn is_type(wanted: Type) -> bool
```

`value(item)` তার argument-টাকে box-এর ভেতর সরিয়ে নেয়। একটা checked `as?`
copyable payload কপি করে। move-only payload নিতে হলে লিখুন `move boxed as? T`।

## Annotation descriptor

```beans
pub class AnnotationType
pub fn qualified_name() -> string
pub fn name() -> string
pub fn is_public() -> bool
pub fn is_repeatable() -> bool
pub fn retention() -> string
pub fn targets() -> List<string>
pub fn fields() -> List<AnnotationField>
pub fn field(name: string) -> Option<AnnotationField>
pub fn annotations() -> List<Annotation>
```

```beans
pub class AnnotationField
pub fn name() -> string
pub fn type() -> Type
pub fn has_default() -> bool
pub fn default_value() -> Option<AnnotationValue>
```

```beans
pub class Annotation
pub fn qualified_name() -> string
pub fn name() -> string
pub fn type() -> AnnotationType
pub fn arguments() -> List<AnnotationArgument>
pub fn argument(name: string) -> Option<AnnotationArgument>
```

```beans
pub class AnnotationArgument
pub fn name() -> string
pub fn type() -> Type
pub fn value() -> AnnotationValue
```

```beans
pub class AnnotationValue
pub fn kind() -> AnnotationValueKind
pub fn type() -> Type
pub fn text() -> string
pub fn as_bool() -> Option<bool>
pub fn as_int() -> Option<int>
pub fn as_string() -> Option<string>
pub fn items() -> List<AnnotationValue>
```

## Error আর enum

```beans
pub class ReflectError
pub fn kind() -> ErrorKind
pub fn message() -> string
```

`Kind`-এ আছে `unit`, `boolean`, `signed_integer`, `unsigned_integer`, `floating`,
`decimal`, `string`, `class_type`, `interface_type`, `struct_type`,
`union_type`, `enum_type`, `list`, `map`, `option`, `result`, `fixed_array`,
`slice`, `raw_pointer`, `function_type`, আর `other`।

`Passing`-এ আছে `borrowed`, `taken`, আর `mutable`।

`AnnotationValueKind`-এ আছে `boolean`, `signed_integer`, `unsigned_integer`,
`floating`, `decimal`, `string`, `enum_value`, `list`, আর `other`।

`ErrorKind`-এ আছে `missing`, `inaccessible`, `receiver_type`, `value_type`,
`unsupported`, `argument_count`, আর `failed`।
