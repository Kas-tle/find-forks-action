# ForkFinder

A GitHub action to find the URL of a user's fork for a given repository. 

## Usage

```yaml
- name: Find Fork
  id: forkfinder
  uses: Kas-tle/ForkFinder@v1.0.1
  with:
    owner: 'Kas-tle'
    repo: 'ForkFinder'
    target_user: 'SomeUser'
    target_branch: 'main'
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

- `owner` - The owner of the repository to find the fork of. If none is specified, the owner of the repository in which the action is running will be used.
- `repo` - The name of the repository to find the fork of. If none is specified, the repository in which the action is running will be used.
- `target_user` - The user to find the fork of. If none is specified in the case of a PR, the user who authored the PR will be used. If none is specified in any other context, the owner of the repository in which the action is running will be used.
- `target_branch` - The branch to find the fork of. If none is specified, in the case of a PR, the branch of the PR will be used. If none is specified in any other context, the current branch will be used.
- `token` - The GitHub token to use for authentication with the GitHub API (Required).

## Outputs

- `user_fork_url` - The URL of the target user's fork of the repository, or `null` if none is found.
- `target_branch_found` - Whether or not the target user's fork has the target branch.
