import * as core from "@actions/core";
import * as github from "@actions/github";
import { z } from "zod";
import { load } from "js-yaml";

export const main = async () => {
  run({
    githubToken: core.getInput("github_token"),
    needs: Needs.parse(JSON.parse(core.getInput("needs", { required: true }))),
    checkWorkflow: core.getBooleanInput("check_workflow"),
    job: process.env.GITHUB_JOB || "",
    workflowRef: process.env.GITHUB_WORKFLOW_REF || "",
    workflowSHA: process.env.GITHUB_WORKFLOW_SHA || "",
  });
};

const run = async (input: Input) => {
  // debug
  core.info(`needs: ${input.needs}`);
  core.info(`checkWorkflow: ${input.checkWorkflow}`);
  core.info(`job: ${input.job}`);
  core.info(`workflowRef: ${input.workflowRef}`);
  core.info(`workflowSHA: ${input.workflowSHA}`);

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
  jobs: z.map(z.string(), Job),
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
  for (const need of Object.values(input.needs)) {
    if (need.result === "failure") {
      throw new Error("a need failed");
    }
  }
};

const getWorkflow = async (input: Input): Promise<Workflow> => {
  // parse workflow ref
  // <owner>/<repo>/<path>@<ref>
  const workflowParts = input.workflowRef.split("@")[0].split("/");
  const workflowOwner = workflowParts[0];
  const workflowRepo = workflowParts[1];
  const workflowPath = workflowParts[2];

  // reads or downloads the workflow file
  const octokit = github.getOctokit(input.githubToken);
  const resp = await octokit.rest.repos.getContent({
    owner: workflowOwner,
    repo: workflowRepo,
    path: workflowPath,
    ref: input.workflowSHA,
  });
  const data = resp.data as { content?: string };
  if (data.content === undefined) {
    throw new Error("workflow file is not a file");
  }
  if (data.content === "") {
    throw new Error("workflow file is empty");
  }
  return Workflow.parse(load(data.content));
};

const validateWorkflow = (input: Input, workflow: Workflow) => {
  const allJobKeys = new Set(workflow.jobs.keys());
  const jobKeys = new Set([input.job]);
  if (!workflow.jobs.has(input.job)) {
    throw new Error(`job ${input.job} not found in workflow`);
  }
  let count = 1;
  while (true) {
    for (const [jobKey, job] of workflow.jobs.entries()) {
      if (!shouldAdd(jobKeys, jobKey, job)) {
        continue;
      }
      addJob(jobKeys, jobKey, job);
    }
    if (jobKeys.size === count) {
      break;
    }
    count = jobKeys.size;
  }
  const invalidJobs = new Set<string>();
  for (const jobKey of allJobKeys) {
    if (!jobKeys.has(jobKey)) {
      invalidJobs.add(jobKey);
    }
  }
  if (invalidJobs.size > 0) {
    throw new Error(
      `jobs ${Array.from(invalidJobs).join(", ")} should be added to the needs of ${input.job}`,
    );
  }
};

const shouldAdd = (jobKeys: Set<string>, jobKey: string, job: Job): boolean => {
  if (job.needs === undefined) {
    return false;
  }
  if (jobKeys.has(jobKey)) {
    return true;
  }
  if (typeof job.needs === "string") {
    return jobKeys.has(job.needs);
  }
  for (const need of job.needs) {
    if (jobKeys.has(need)) {
      return true;
    }
  }
  return false;
};

const addJob = (jobKeys: Set<string>, jobKey: string, job: Job) => {
  if (job.needs === undefined) {
    return;
  }
  jobKeys.add(jobKey);
  if (typeof job.needs === "string") {
    jobKeys.add(job.needs);
    return;
  }
  for (const need of job.needs) {
    jobKeys.add(need);
  }
};
