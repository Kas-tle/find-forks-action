const https = require("https");
const core = require('@actions/core');
const github = require('@actions/github');
const fs = require("fs");

try {
    const context = github.context;
    const { owner: currentOwner, repo: currentRepo } = context.repo;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    const event = JSON.parse(fs.readFileSync(eventPath, "utf-8"));
    let repositoryOwner = process.env.GITHUB_REPOSITORY.split("/")[0];
    if (event.pull_request) {
        repositoryOwner = event.pull_request.head.repo.owner.login;
    }

    const owner = core.getInput('owner', {required: false}) || currentOwner;
    const repo = core.getInput('repo', {required: false}) || currentRepo;
    const targetUser = core.getInput('target_user', {required: false}) || repositoryOwner;
    const targetBranch = core.getInput('target_branch', {required: false}) || process.env.GITHUB_REF.split("/").slice(-1)[0];
    const githubToken = core.getInput('token', {required: true});

    let checkBranch = true;
    if (targetBranch === "") {
        checkBranch = false;
    }

    const options = {
        hostname: "api.github.com",
        headers: {
            "User-Agent": "Find Forks",
            "Authorization": `Bearer ${githubToken}`
        }
    };

    let forksPage = 1;
    let foundFork = false;
    let userFork = null;

    function getForks() {
        core.debug(`Getting forks for page: ${forksPage}`);
        options.path = `/repos/${owner}/${repo}/forks?per_page=100&page=${forksPage}`;
        https.get(options, res => {
            res.setEncoding("utf8");
            let body = "";
            res.on("data", data => {
                body += data;
            });
            res.on("end", () => {
                const forks = JSON.parse(body);
                if (forks.length === 0) {
                    core.info(`No match was found for user "${targetUser}"`);
                    return;
                }
                forks.every(fork => {
                    core.debug(`Checking user: ${fork.owner.login}`);
                    if (fork.owner.login === targetUser) {
                        foundFork = true;
                        userFork = fork.html_url;
                        core.setOutput("user_fork_url", userFork);
                        if (checkBranch) {
                            options.path = `/repos/${fork.full_name}/branches/${targetBranch}`;
                            https.get(options, res => {
                                if (res.statusCode === 200) {
                                    core.info(`Found match for user "${targetUser}" with branch "${targetBranch}" at URL: ${userFork}`);
                                    found = true;
                                    core.setOutput("target_branch_found", true);
                                    return;
                                } else if (res.statusCode === 404) {
                                    core.info(`Branch "${targetBranch}" not found for user "${targetUser}"`);
                                    core.setOutput("target_branch_found", false);
                                    return;
                                }
                            });
                        }
                        return false;
                    }
                    return true;
                });
                if (! foundFork) {
                    forksPage++;
                    getForks();
                }
            });
        });
    }
    getForks();
} catch (error) {
    core.setFailed(error.message);
}
