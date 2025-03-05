import { expect, test } from "vitest";
import {
  validateInput,
  validateNeeds,
  validateWorkflow,
  parseWorkflowRef,
  parseWorkflowData,
} from "./run";
import { parse } from "path";

test("validateInput", () => {
  expect(() =>
    validateInput({
      githubToken: "xxx",
      needs: {},
      checkWorkflow: false,
      job: "",
      workflowRef:
        "suzuki-shunsuke/required-status-check-action/.github/workflows/pull_request.yaml@refs/pull/1/merge",
      workflowSHA: "xxx",
      ignoredJobKeys: [],
    }),
  ).toThrowError("GITHUB_JOB is required");
  expect(() =>
    validateInput({
      githubToken: "xxx",
      needs: {},
      checkWorkflow: false,
      job: "status-check",
      workflowRef: "",
      workflowSHA: "xxx",
      ignoredJobKeys: [],
    }),
  ).toThrowError("GITHUB_WORKFLOW_REF is required");
  expect(() =>
    validateInput({
      githubToken: "xxx",
      needs: {},
      checkWorkflow: false,
      job: "status-check",
      workflowRef:
        "suzuki-shunsuke/required-status-check-action/.github/workflows/pull_request.yaml@refs/pull/1/merge",
      workflowSHA: "",
      ignoredJobKeys: [],
    }),
  ).toThrowError("GITHUB_WORKFLOW_SHA is required");
});

test("validateNeeds", () => {
  expect(() =>
    validateNeeds({
      foo: {
        result: "failure",
      },
      bar: {
        result: "failure",
      },
    }),
  ).toThrowError("Jobs (bar, foo) failed");
});

test("validateWorkflow", () => {
  expect(() =>
    validateWorkflow(
      {
        githubToken: "xxx",
        needs: {
          test: {
            result: "success",
          },
        },
        checkWorkflow: false,
        job: "status-check",
        workflowRef:
          "suzuki-shunsuke/required-status-check-action/.github/workflows/pull_request.yaml@refs/pull/1/merge",
        workflowSHA: "xxx",
        ignoredJobKeys: [],
      },
      {
        jobs: {
          test: {},
          build: {},
          foo: {},
          "status-check": {
            needs: ["test"],
          },
        },
      },
    ),
  ).toThrowError(
    "Jobs (build, foo) must be added to status-check's needs or ignored_jobs",
  );
});

test("parseWorkflowRef", () => {
  expect(
    parseWorkflowRef(
      "suzuki-shunsuke/required-status-check-action/.github/workflows/pull_request.yaml@refs/pull/1/merge",
      "xxx",
    ),
  ).toEqual({
    owner: "suzuki-shunsuke",
    repo: "required-status-check-action",
    path: ".github/workflows/pull_request.yaml",
    ref: "xxx",
  });
});

test("parseWorkflowData", () => {
  expect(
    parseWorkflowData(`bmFtZTogcHVsbCByZXF1ZXN0Cm9uOiBwdWxsX3JlcXVlc3QKam9iczoKICB0ZXN0OgogICAgcnVu
cy1vbjogdWJ1bnR1LTI0LjA0CiAgICBwZXJtaXNzaW9uczoge30KICAgIHRpbWVvdXQtbWludXRl
czogMTAKICAgIHN0ZXBzOgogICAgICAtIHJ1bjogdGVzdCAtbiAiJEZPTyIKICAgICAgICBlbnY6
CiAgICAgICAgICBGT086ICR7e3ZhcnMuRk9PfX0KICBidWlsZDoKICAgIHJ1bnMtb246IHVidW50
dS0yNC4wNAogICAgcGVybWlzc2lvbnM6IHt9CiAgICB0aW1lb3V0LW1pbnV0ZXM6IDEwCiAgICBz
dGVwczoKICAgICAgLSBydW46IHRlc3QgLW4gIiRGT08iCiAgICAgICAgZW52OgogICAgICAgICAg
Rk9POiAke3t2YXJzLkZPT319CiAgY2hlY2s6CiAgICBydW5zLW9uOiB1YnVudHUtMjQuMDQKICAg
IHBlcm1pc3Npb25zOiB7fQogICAgdGltZW91dC1taW51dGVzOiAxMAogICAgc3RlcHM6CiAgICAg
IC0gcnVuOiB0ZXN0IC1uICIkRk9PIgogICAgICAgIGVudjoKICAgICAgICAgIEZPTzogJHt7dmFy
cy5GT099fQogIHN0YXR1cy1jaGVjazoKICAgIHJ1bnMtb246IHVidW50dS0yNC4wNAogICAgdGlt
ZW91dC1taW51dGVzOiAxMAogICAgbmVlZHM6CiAgICAgIC0gdGVzdAogICAgICAtIGJ1aWxkCiAg
ICAgIC0gY2hlY2sKICAgIGlmOiBhbHdheXMoKQogICAgcGVybWlzc2lvbnM6CiAgICAgIGNvbnRl
bnRzOiByZWFkICMgVG8gZ2V0IHRoZSB3b3JrZmxvdyBjb250ZW50IGJ5IEdpdEh1YiBBUEkKICAg
IHN0ZXBzOgogICAgICAtIHVzZXM6IHN1enVraS1zaHVuc3VrZS9yZXF1aXJlZC1zdGF0dXMtY2hl
Y2stYWN0aW9uQGxhdGVzdAogICAgICAgIHdpdGg6CiAgICAgICAgICBuZWVkczogJHt7IHRvSnNv
bihuZWVkcykgfX0KICAgICAgICAgIGlnbm9yZWRfam9iczogfAogICAgICAgICAgICBtZXJnZQog
IG1lcmdlOgogICAgcnVucy1vbjogdWJ1bnR1LTI0LjA0CiAgICBwZXJtaXNzaW9uczoge30KICAg
IHRpbWVvdXQtbWludXRlczogMTAKICAgIG5lZWRzOgogICAgICAtIHN0YXR1cy1jaGVjawogICAg
c3RlcHM6CiAgICAgIC0gcnVuOiB0ZXN0IC1uICIkRk9PIgogICAgICAgIGVudjoKICAgICAgICAg
IEZPTzogJHt7dmFycy5GT099fQo=
`),
  ).toEqual({
    jobs: {
      test: {},
      build: {},
      check: {},
      "status-check": {
        needs: ["test", "build", "check"],
      },
      merge: {
        needs: ["status-check"],
      },
    },
  });
});
