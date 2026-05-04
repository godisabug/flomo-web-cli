export function ok(stdout) {
    return {
        stdout,
        stderr: "",
        exitCode: 0
    };
}
