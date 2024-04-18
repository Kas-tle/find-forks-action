import https from "https";
import core from '@actions/core';
import github from '@actions/github';
import fs from "fs";
import { RestEndpointMethodTypes } from "@octokit/rest";

try {
    const context = github.context;
    const { owner: currentOwner, repo: currentRepo } = context.repo;
    const eventPath: string = process.env.GITHUB_EVENT_PATH!;
    const event = JSON.parse(fs.readFileSync(eventPath, "utf-8"));
    let repositoryOwner = process.env.GITHUB_REPOSITORY!.split("/")[0];
    let repositoryName = process.env.GITHUB_REPOSITORY!.split("/")[1];
    if (event.pull_request) {
        repositoryOwner = event.pull_request.head.repo.owner.login;
        repositoryName = event.pull_request.head.ref;
    }

    const owner = core.getInput('owner', {required: false}) || currentOwner;
    const repo = core.getInput('repo', {required: false}) || currentRepo;
    const targetUser = core.getInput('target_user', {required: false}) || repositoryOwner;
    const targetBranch = core.getInput('target_branch', {required: false}) || repositoryName;
    const githubToken = core.getInput('token', {required: true});

    const options: https.RequestOptions = {
        hostname: "api.github.com",
        headers: {
            "User-Agent": "Find Forks",
            "Authorization": `Bearer ${githubToken}`
        }
    };

    let forksPage = 1;
    let foundFork = false;
    let userFork: string | null = null;

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
                const forks: RestEndpointMethodTypes["repos"]["listForks"]["response"]["data"] = JSON.parse(body);
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
                        options.path = `/repos/${fork.full_name}/branches/${targetBranch}`;
                        https.get(options, res => {
                            if (res.statusCode === 200) {
                                core.info(`Found match for user ${targetUser} with branch ${targetBranch} at URL ${userFork}`);
                                foundFork = true;
                                core.setOutput("target_branch_found", true);
                                return;
                            } else if (res.statusCode === 404) {
                                core.info(`Found match for user ${targetUser} at URL ${userFork}`);
                                core.setOutput("target_branch_found", false);
                                return;
                            }
                        });
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
} catch (error: any) {
    core.setFailed(error.message);
}
