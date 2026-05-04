export class FlomoError extends Error {
    code;
    status;
    constructor(code, message, options) {
        super(message, { cause: options?.cause });
        this.name = "FlomoError";
        this.code = code;
        this.status = options?.status;
    }
}
export class FlomoAuthError extends FlomoError {
    constructor(message = "flomo 登录态失效或权限不足，请重新抓取 Authorization。", options) {
        super("AUTH_EXPIRED", message, options);
        this.name = "FlomoAuthError";
    }
}
export class FlomoRequestError extends FlomoError {
    constructor(code, message, options) {
        super(code, message, options);
        this.name = "FlomoRequestError";
    }
}
export class FlomoParseError extends FlomoError {
    constructor(message = "flomo 返回结构解析失败，内部接口可能已经变化。", options) {
        super("PARSER_FAILED", message, options);
        this.name = "FlomoParseError";
    }
}
export class CliError extends Error {
    code;
    constructor(code, message, options) {
        super(message, { cause: options?.cause });
        this.name = "CliError";
        this.code = code;
    }
}
export function toPublicError(error) {
    if (error instanceof FlomoError || error instanceof CliError) {
        return {
            code: error.code,
            message: error.message
        };
    }
    return {
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "未知错误。"
    };
}
