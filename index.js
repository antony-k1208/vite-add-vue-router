#!/usr/bin/env node

import prompts from 'prompts';
import exec from 'await-exec';
import { mkdir, readFile, writeFile } from 'fs/promises';

function generateRouterConfig() {
  return `
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
  ],
});

export default router;
`;
}

function generateAppVue() {
  return `
<template>
    <router-view />
</template>
`;
}

async function generateRouterFiles(fileEnding) {
  await mkdir('src/router', { recursive: true });
  await writeFile(`src/router/index.${fileEnding}`, generateRouterConfig());
}

async function generateVueFiles() {
  await mkdir('src/views', { recursive: true });

  const oldAppVue = (await readFile('src/App.vue')).toString();

  await writeFile('src/views/Home.vue', oldAppVue.replaceAll('./', '../'));
  await writeFile('src/App.vue', generateAppVue());
}

async function generateMainFile(fileEnding) {
  const vueConfig = (await readFile(`src/main.${fileEnding}`)).toString();
  let vueConfigLines = vueConfig.slice().split('\n');
  const lastImportLine = vueConfigLines
    .map((line) => line.indexOf('import ') !== -1)
    .lastIndexOf(true);

  vueConfigLines.splice(
    lastImportLine + 1,
    0,
    'import router from "./router";'
  );

  vueConfigLines[vueConfigLines.length - 2] = vueConfigLines[
    vueConfigLines.length - 2
  ].replace('.mount(', '.use(router).mount(');

  await writeFile('src/main.ts', vueConfigLines.join('\n'));
}

async function init() {
  let result = {};

  try {
    result = await prompts(
      [
        {
          name: 'usesTypeScropt',
          type: () => 'toggle',
          message: 'Is it a TypeScript-based project?',
          initial: false,
          active: 'Yes',
          inactive: 'No',
        },
        {
          name: 'npmExecutable',
          type: () => 'text',
          message: 'The npm executable to use',
          initial: 'npm',
        },
      ],
      {
        onCancel: () => {
          throw new Error(red('✖') + ' Operation cancelled');
        },
      }
    );
  } catch (cancelled) {
    console.log(cancelled.message);
    process.exit(1);
  }

  const {
    usesTypeScript = result.usesTypeScropt,
    npmExecutable = result.npmExecutable,
  } = result;

  const fileEnding = usesTypeScript ? 'ts' : 'js';

  console.log('Installing vue-router...');
  await exec(`${npmExecutable} install vue-router`);

  await generateRouterFiles(fileEnding);
  await generateVueFiles();
  await generateMainFile(fileEnding);

  console.log('Installed vue-router!');
}

init().catch((e) => {
  console.error(e);
});
