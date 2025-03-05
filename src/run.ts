import * as core from "@actions/core";
import * as github from "@actions/github";
import { z } from "zod";
import { load } from "js-yaml";

export const main = async () => {
  const inputNeeds = core.getInput("needs", { required: true });
  let needsJSON: any;
  try {
    needsJSON = JSON.parse(inputNeeds);
  } catch (error) {
    throw new Error(`needs is not a valid JSON: ${error}`);
  }
  const needs = Needs.safeParse(needsJSON);
  if (!needs.success) {
    throw new Error(
      `needs must be either a string or an array of strings: ${needs.error}`,
    );
  }
  run({
    githubToken: core.getInput("github_token"),
    needs: needs.data,
    checkWorkflow: core.getBooleanInput("check_workflow"),
    job: core.getInput("job"),
    workflowRef: process.env.GITHUB_WORKFLOW_REF || "",
    workflowSHA: process.env.GITHUB_WORKFLOW_SHA || "",
    ignoredJobKeys: core.getInput("ignored_job_keys").split("\n").map((s) => s.trim()).filter((s) => s !== ""),
  });
};

const run = async (input: Input) => {
  // debug
  core.info(`parameters:
  needs: ${input.needs}
  checkWorkflow: ${input.checkWorkflow}
  job: ${input.job}
  workflowRef: ${input.workflowRef}
  workflowSHA: ${input.workflowSHA}`);

  validateNeeds(input);
  if (!input.checkWorkflow) {
    return;
  }
  validateInput(input);
  const workflow = await getWorkflow(input);
  validateWorkflow(input, workflow);
};

/* needs
 {
  "foo": {
    "result": "failure",
    "outputs": {}
  },
  "bar": {
    "result": "failure",
    "outputs": {}
  }
*/

export type Input = {
  githubToken: string;
  needs: Needs;
  checkWorkflow: boolean;
  job: string;
  workflowRef: string;
  workflowSHA: string;
  ignoredJobKeys: string[];
};

const Need = z.object({
  result: z.string(),
});
export type Need = z.infer<typeof Need>;

const Needs = z.record(z.string(), Need);
type Needs = z.infer<typeof Needs>;

/* workflow
jobs:
  job1:
    needs: [job2]
*/

const Job = z.object({
  needs: z.optional(z.union([z.string(), z.array(z.string())])),
});
type Job = z.infer<typeof Job>;

const Workflow = z.object({
  jobs: z.record(z.string(), Job),
});
type Workflow = z.infer<typeof Workflow>;

const validateInput = (input: Input) => {
  if (input.job === "") {
    throw new Error("GITHUB_JOB is required");
  }
  if (input.workflowRef === "") {
    throw new Error("GITHUB_WORKFLOW_REF is required");
  }
  if (input.workflowSHA === "") {
    throw new Error("GITHUB_WORKFLOW_SHA is required");
  }
};

const validateNeeds = (input: Input) => {
  for (const [jobKey, need] of Object.entries(input.needs)) {
    if (need.result === "failure") {
      throw new Error(`the job ${jobKey} failed`);
    }
  }
};

const getWorkflow = async (input: Input): Promise<Workflow> => {
  // parse workflow ref
  // <owner>/<repo>/<path>@<ref>
  const workflowParts = input.workflowRef.split("@")[0].split("/");
  const workflowOwner = workflowParts[0];
  const workflowRepo = workflowParts[1];
  const workflowPath = workflowParts.slice(2).join("/");

  // reads or downloads the workflow file
  const octokit = github.getOctokit(input.githubToken);
  core.info(
    `fetching workflow file ${workflowPath} (${input.workflowSHA}) from ${workflowOwner}/${workflowRepo}`,
  );
  const resp = await octokit.rest.repos.getContent({
    owner: workflowOwner,
    repo: workflowRepo,
    path: workflowPath,
    ref: input.workflowSHA,
  });
  resp.status;
  const data = resp.data as { content?: string };
  if (data.content === undefined) {
    throw new Error(
      `workflow file is not a file: (${resp.status}) ${JSON.stringify(resp.data)}`,
    );
  }
  if (data.content === "") {
    throw new Error("workflow file is empty");
  }

  let contentYAML;
  try {
    contentYAML = load(Buffer.from(data.content, "base64").toString("utf-8"));
  } catch (error) {
    throw new Error(`the workflow file is not a valid YAML: ${error}`);
  }

  const w = Workflow.safeParse(contentYAML);
  if (!w.success) {
    throw new Error(`the workflow file is not a valid workflow: ${w.error}`);
  }
  return w.data;
};

const validateWorkflow = (input: Input, workflow: Workflow) => {
  const jobKeys = new Set(Object.keys(input.needs).concat(input.ignoredJobKeys).concat([input.job]));
  for (const jobKey of Object.keys(workflow.jobs)) {
    if (!jobKeys.has(jobKey)) {
      throw new Error(`The job ${jobKey} must be added to ${input.job}'s needs or ignored_jobs`);
    }
  }
};
