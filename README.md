# vite-plugin-babel-compiler

Vite runtime uses Babel compiler

> Work around some experimental features not supported by Esbuild.

## Install

```bash
npm i -D vite-plugin-babel-compiler
```

Add plugin to your `vite.config.ts`:

## Config Decorator

```bash
npm install -D @babel/plugin-proposal-class-properties
npm install -D @babel/plugin-proposal-decorators
```

```typescript
import babel from 'vite-plugin-babel-compiler'

{
    plugins: [
        babel({
            babel: {
                plugins: [
                        ['@babel/plugin-proposal-decorators', { legacy: true }],
                        ['@babel/plugin-proposal-class-properties', { loose: true }],
                ],
                exclude: ['dep',/path/]
                include: ['dep',/path/]
            }
        })
    ]
}

```
