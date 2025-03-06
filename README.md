# required-status-check-action

[![License](http://img.shields.io/badge/license-mit-blue.svg?style=flat-square)](https://raw.githubusercontent.com/suzuki-shunsuke/required-status-check-action/main/LICENSE) | [action.yaml](action.yaml) | [Contributing](CONTRIBUTING.md)

`required-status-check-action` is a GitHub Action to allow you to configure GitHub Branch Rulesets' `Require status checks to pass` easily and securely.
You don't need to add all jobs to `Status checks that are required`.
By adding all jobs to `needs` of the job `status-check`, `required-status-check-action` validates if all jobs pass.

```yaml
status-check:
  runs-on: ubuntu-24.04
  timeout-minutes: 10
  needs: # Add all jobs
    - test
    - build
  if: always() # This job must be run always
  permissions:
    contents: read # To get the workflow content by GitHub API
  steps:
    - uses: suzuki-shunsuke/required-status-check-action@2b5a46064846b09381852c2c4217e898f639e768 # v0.1.3
      with:
        needs: ${{ toJson(needs) }} # Required
```

Furthermore, `required-status-check-action` validates if all jobs are added to `needs` of `required-status-check-action`.

## Getting Started

First, please create a GitHub Repository and add a GitHub Actions Workflow:

```yaml
name: pull request
on: pull_request
jobs:
  test:
    runs-on: ubuntu-24.04
    permissions: {}
    timeout-minutes: 10
    steps:
      - run: test -n "$FOO"
        env:
          FOO: ${{vars.FOO}}
  build:
    runs-on: ubuntu-24.04
    permissions: {}
    timeout-minutes: 10
    steps:
      - run: test -n "$FOO"
        env:
          FOO: ${{vars.FOO}}
```

Let's configure Branch Rulesets so that jobs `test` and `build` must pass to merge pull requests.

1. Enable `Require status checks to pass`
1. Add `test` and `build` to `Status checks that are required`

But if you add all jobs to `Status checks that are required`, you need to update both the workflow and `Status checks that are required` every time you want to add, remove, or rename jobs.
It's inconvenient.
Furthermore, if you forget to add jobs to `Status checks that are required`, pull requests can be merged even if those jobs fail.
It's undesirable.

To solve the issue, let's add a job `status-check` to the workflow and `Status checks that are required`.
You can remove `test` and `build` from `Status checks that are required`.

```yaml
status-check:
  runs-on: ubuntu-24.04
  timeout-minutes: 10
  needs: # Add all jobs
    - test
    - build
  if: always() # This job must be run always
  permissions:
    contents: read # To get the workflow content by GitHub API
  steps:
    - uses: suzuki-shunsuke/required-status-check-action@2b5a46064846b09381852c2c4217e898f639e768 # v0.1.3
      with:
        needs: ${{ toJson(needs) }} # Required
```

Let's create a pull request and run the workflow.
Then `status-check` fails because `test` and `build` fail. 👍

![image](https://github.com/user-attachments/assets/36fe3c41-400d-48d0-a26c-ce798ab91942)

`test` and `build` fail because the variable `FOO` isn't set.

```yaml
- run: test -n "$FOO"
  env:
    FOO: ${{vars.FOO}}
```

To solve the error, let's set the varible.

![image](https://github.com/user-attachments/assets/1578aef2-529d-4be1-a06a-ee036dc3df0a)

And rerun only `test`.

![rerun only test](https://github.com/user-attachments/assets/d3f6e31d-380b-4128-b8b1-b18a3506dba4)

Then `test` succeeds but `status-check` fails expectedly because `build` fails. 👍

![image](https://github.com/user-attachments/assets/a214dd3e-00f0-461a-ae70-5402c73fe2ec)

Let's Re-run `build` too. Then all jobs pass.
`status-check` succeeds because both `test` and `build` succeed. 👍

![image](https://github.com/user-attachments/assets/5646e20b-ca13-402b-80c4-4121db5195b7)

Let's add a new job `check`.

```yaml
check:
  runs-on: ubuntu-24.04
  permissions: {}
  timeout-minutes: 10
  steps:
    - run: echo "check"
```

Note that `check` isn't included in `status-check`'s `needs` now.
All jobs except for `status-check` pass but `status-check` fails because `check` isn't included in `status-check`'s `needs`. 👍

![image](https://github.com/user-attachments/assets/1c0f338c-7db0-483e-835b-3e401293308c)

```
Error: Jobs (check) must be added to status-check's needs or ignored_jobs
```

To solve the error, let's add `check` to `status-check`'s `needs`.

```yaml
status-check:
  runs-on: ubuntu-24.04
  timeout-minutes: 10
  needs:
    - test
    - build
    - check
```

Then all jobs pass. 👍

![image](https://github.com/user-attachments/assets/a4d7d3a7-a0b0-460b-b813-abb3866044a2)

### Ignore some jobs

Maybe you want to run any jobs after `status-check`.
Let's add a job `merge` and add `status-check` to the job's `needs`.

```yaml
merge:
  runs-on: ubuntu-24.04
  permissions: {}
  timeout-minutes: 10
  needs:
    - status-check
  steps:
    - run: echo "merge"
```

Then `status-check` fails because `merge` isn't included in `needs` of `status-check`.

![image](https://github.com/user-attachments/assets/0f3f04f0-6404-44ca-890e-ad3fec320fd7)

```
Error: Jobs (merge) must be added to status-check's needs or ignored_jobs
```

Of course, you can't add `merge` to `needs` of `status-check`.
To resolve the error, please add `merge` to `ignored_jobs` of `status-check`.

```yaml
- uses: suzuki-shunsuke/required-status-check-action@2b5a46064846b09381852c2c4217e898f639e768 # v0.1.3
  with:
    needs: ${{ toJson(needs) }}
    ignored_jobs: |
      merge
```

Then `status-check` passes. 👍

![image](https://github.com/user-attachments/assets/ac7fc4d7-17c7-4401-9386-a8e19d9a0eca)

You can also ignore multiple jobs.

```yaml
ignored_jobs: |
  merge
  after-merge
```

## Available versions

> [!CAUTION]
> We don't add `dist/*.js` in the main branch and feature branches.
> So you can't specify `main` and feature branches as versions.
>
> ```yaml
> # This never works as dist/index.js doesn't exist.
> uses: suzuki-shunsuke/required-status-check-action@main
> ```

The following versions are available.

1. [Release versions](https://github.com/suzuki-shunsuke/required-status-check-action/releases)

```yaml
uses: suzuki-shunsuke/required-status-check-action@2b5a46064846b09381852c2c4217e898f639e768 # v0.1.3
```

2. [Pull Request versions](https://github.com/suzuki-shunsuke/required-status-check-action/branches/all?query=pr%2F&lastTab=overview): These versions are removed when we feel unnecessary. These versions are used to test pull requests.

```yaml
uses: suzuki-shunsuke/required-status-check-action@pr/10
```

3. [latest branch](https://github.com/suzuki-shunsuke/required-status-check-action/tree/latest): [This branch is built by CI when the main branch is updated](https://github.com/suzuki-shunsuke/required-status-check-action/blob/latest/.github/workflows/main.yaml). Note that we push commits to the latest branch forcibly.

```yaml
uses: suzuki-shunsuke/required-status-check-action@latest
```

Pull Request versions and the latest branch are unstable.
These versions are for testing.
You should use the latest release version in production.

## Inputs / Outputs

See [action.yaml](action.yaml) too.

### Required Inputs

- `needs`: This must be `${{ toJson(needs) }}`

### Optional Inputs

- `job`: The job key of `status-check`. By default, `${{github.job}}` is used.
- `github_token`: A GitHub Access token. This token is used to get the file content of the workflow. The permission `contents:read` is required. By default, `${{github.token}}` is used.
- `check_workflow`: A boolean. If true, the workflow file is validated. This input is useful if you want to validate the workflow only when the workflow is changed
- `ignore_jobs`: The list of ignored job keys. Each job key is separated by newline.

e.g.

```yaml
ignore_jobs: |
  foo
  bar
```

### Outputs

Nothing.

## Appendix

Note that there are known bugs about the evaluation of GitHub Actions' job's `if` statement.

- https://github.com/actions/runner/issues/491
- https://github.com/orgs/community/discussions/45058

So some workflows don't work well.
We developed `require-status-check-action` to solve this issue.

### `failure()`

`if: failure()` doesn't work as expected.

```yaml
status-check:
  runs-on: ubuntu-24.04
  needs: [foo, bar]
  if: failure()
  steps:
    - run: exit 1
```

If you rerun only `bar` and `bar` succeeds, `status-check` is skipped and the pull request can be merged even if `foo` still fails.

![image](https://github.com/user-attachments/assets/647ea3c8-278e-4958-81d6-38be5394782d)

### `contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')`

`contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')` doesn't work as expected.

```yaml
status-check:
  runs-on: ubuntu-24.04
  needs: [foo, bar]
  if: contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')
  steps:
    - run: exit 1
```

Even if `foo` and `bar` fail `status-check` is skipped.

![image](https://github.com/user-attachments/assets/6d101ba1-cb9e-4fbf-a5ac-afa08ac19ead)

### `if` statement isn't set

If `if` statement isn't set, `status-check` is skipped if `foo` or `bar` fails, so the pull request can't be merged.

```yaml
status-check:
  runs-on: ubuntu-24.04
  needs: [foo, bar]
  steps:
    - run: exit 0
```

![image](https://github.com/user-attachments/assets/87f5ce22-5218-4c61-af0b-0457eb452c2c)
