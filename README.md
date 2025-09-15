# Pang

#### A very minimalistic reactive web UI framework

> [!WARNING]
> This software is still in development. Expect bugs and many rough edges.

This project is an attempt to give you control of your frontend web development.

It is common in web development to have a very complex software stack that the developer doesn't really know anymore what is happening to their code. Not only that, the frameworks keep changing their API that break (or at least deprecate) your code for a reason that might not suit your need. Your code will be very fragile because there are so many moving parts. Maybe that's okay if your aim is to make something fast (in development time) and easily (note that what i mean is easy, not simple, because the stack is very complex). But if you want a long lasting code, then you are out of luck.

The approach of this project is to make the framework part of your code, so you can change it whatever you want. The framework code is very small (just a few thousands LOC). If you don't have a time to get your hands dirty, i don't recommend using this framework.

#### Syntax

The syntax is highly inspired by [SolidJS](https://www.solidjs.com/).

#### How reactivity works

Reactivity is achieved using signal based approach.

#### Software stacks used

- Typescript
- Vite
- Babel (for JSX transformation)

#### Features

- JSX
- Reactive state (primitive & nested)
- Lifecycle (onMount & onDestroy)
- Transition (inspired by [Svelte](https://svelte.dev/))
- Hash based client routing
- Component scoped css