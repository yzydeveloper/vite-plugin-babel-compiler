import type { TransformOptions } from '@babel/core'
import type { Plugin } from 'vite'
import { readFileSync } from 'fs'
import { transformSync, loadOptions, DEFAULT_EXTENSIONS } from '@babel/core'

export interface PluginBabelCompilerOptions {
    babel: TransformOptions,
    apply: Plugin['apply']
}

export function transform(code: string, rawOptions: TransformOptions & { name: string, filename: string }) {
    const { name: callerName, ...babelOptions } = rawOptions
    const options = loadOptions({
        ...babelOptions,
        caller: {
            name: callerName,
            supportsStaticESM: true
        }
    })
    if (!options) {
        return { code }
    }
    return transformSync(code, options)
}

const VITE_PLUGIN_NAME = 'vite-plugin-babel-compiler'
const ESBUILD_PLUGIN_NAME = 'esbuild-plugin-babel-compiler'

const transformedRegex = new RegExp(`(${DEFAULT_EXTENSIONS.join('|')})$`)

function PluginDecorator(rawOptions: PluginBabelCompilerOptions): Plugin {
    const { apply, babel: options } = rawOptions
    return {
        name: VITE_PLUGIN_NAME,
        apply,
        enforce: 'pre',
        config(config) {
            if (!config.optimizeDeps) config.optimizeDeps = {}
            if (!config.optimizeDeps.esbuildOptions) config.optimizeDeps.esbuildOptions = {}
            if (!config.optimizeDeps.esbuildOptions?.plugins) config.optimizeDeps.esbuildOptions.plugins = []
            config.optimizeDeps.esbuildOptions.plugins.push({
                name: ESBUILD_PLUGIN_NAME,
                setup(build) {
                    build.onLoad(
                        {
                            filter: transformedRegex,
                        },
                        ({ path }) => {
                            const raw = readFileSync(path, 'utf-8')
                            const { code } = transform(raw, {
                                ...options,
                                name: ESBUILD_PLUGIN_NAME,
                                filename: path
                            }) ?? {}
                            return {
                                contents: code ?? ''
                            }
                        }
                    )
                }
            })
        },
        transform(code: string, id: string) {
            const shouldTransform = transformedRegex.test(id)
            if(!shouldTransform) return

            const { code: transformedCode, map } = transform(code, {
                ...options,
                name: VITE_PLUGIN_NAME,
                filename: id
            }) ?? {}

            return {
                code: transformedCode ?? '',
                map
            }
        }
    }
}

export default PluginDecorator
