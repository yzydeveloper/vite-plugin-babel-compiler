import type { TransformOptions } from '@babel/core'
import type { Plugin } from 'vite'
import { readFileSync } from 'fs'
import { transformSync, loadOptions, DEFAULT_EXTENSIONS } from '@babel/core'

export interface PluginBabelCompilerOptions {
    babel: TransformOptions,
    apply: Plugin['apply']
}

export const queryRE = /\?.*$/s
export const hashRE = /#.*$/s

export function cleanUrl(url: string): string {
    return url.replace(hashRE, '').replace(queryRE, '')
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

const transformedRegex = new RegExp(`\\.(${DEFAULT_EXTENSIONS.join('|').replace(/\./g, '')})$`)

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
                        ({ path: rawPath }) => {
                            const path = cleanUrl(rawPath)
                            const shouldTransform = transformedRegex.test(path)
                            if (!shouldTransform) return
                            const code = readFileSync(path, 'utf-8')
                            const { code: transformedCode } = transform(code, {
                                ...options,
                                name: ESBUILD_PLUGIN_NAME,
                                filename: path
                            }) ?? {}
                            return {
                                contents: transformedCode ?? ''
                            }
                        }
                    )
                }
            })
        },
        transform(code: string, rawId: string) {
            const id = cleanUrl(rawId)
            const shouldTransform = transformedRegex.test(id)
            if (!shouldTransform) return

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
