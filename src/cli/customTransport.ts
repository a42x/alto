import type { Logger } from "@entrypoint-0.6/utils"
import {
    type HttpTransport,
    type HttpTransportConfig,
    RpcRequestError,
    UrlRequiredError,
    createTransport
} from "viem"
import { type RpcRequest, rpc } from "viem/utils"

export function customTransport(
    /** URL of the JSON-RPC API. Defaults to the chain's public RPC URL. */
    url_: string,
    config: HttpTransportConfig & { logger: Logger }
): HttpTransport {
    const {
        fetchOptions,
        key = "http",
        name = "HTTP JSON-RPC",
        retryDelay,
        logger
    } = config

    return ({ chain, retryCount: retryCount_, timeout: timeout_ }) => {
        const retryCount = config.retryCount ?? retryCount_
        const timeout = timeout_ ?? config.timeout ?? 10_000
        const url = url_ || chain?.rpcUrls.default.http[0]
        if (!url) {
            throw new UrlRequiredError()
        }

        return createTransport(
            {
                key,
                name,
                async request({ method, params }) {
                    const body = { method, params }
                    const fn = async (body: RpcRequest) => {
                        return [
                            await rpc.http(url, {
                                body,
                                fetchOptions,
                                timeout
                            })
                        ]
                    }

                    const [{ error, result }] = await fn(body)
                    if (error) {
                        logger.error(
                            {
                                error,
                                body
                            },
                            "Received error response"
                        )
                        throw new RpcRequestError({
                            body,
                            error,
                            url: url
                        })
                    }
                    logger.info({ body, result }, "Received response")
                    return result
                },
                retryCount,
                retryDelay,
                timeout,
                type: "http"
            },
            {
                fetchOptions,
                url
            }
        )
    }
}
