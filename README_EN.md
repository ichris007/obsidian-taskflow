# TaskFlow
[中文](./README.md) | [English](./README_EN.md)

> **You don't need more tasks. You need the next step.**

**TaskFlow** is an **action workbench** for [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks).

It doesn't change any of your existing task syntax or query logic. Instead, it builds a dynamic **Action Space** on top of your task lists.

It reorganizes your tasks and reduces the cost of choosing across three dimensions — **Time**, **GTD**, and **Context** — so that action happens faster.

---

## 01 | Why We Built This

We already have plenty of tools to help us **record tasks**.

But the more completely we record them, the easier action doesn't necessarily become.

As tasks pile up, what really troubles us is often not:

> **"Do I have anything to do?"**

but rather:

> **"What exactly should I do right now?"**

Open your task list, and dozens or even hundreds of tasks appear at once. You have to re-evaluate:

- Which one matters more?
- Which one should come first?
- What should I do today?
- What suits this time of day?
- What can I do in my current context?

**The act of choosing before acting becomes a burden in itself.**

That's where TaskFlow begins.

---

## 02 | What It Solves

### TaskFlow doesn't solve "too many tasks" — it solves "too hard to choose."

Traditional task management mainly solves:

> **Writing things down so you don't forget.**

But when it comes to actually acting, we still need to solve another problem:

> **Finding the one thing worth doing right now among so many.**

This is a kind of **action decision cost**. The more tasks you have, the more complex your contexts, and the more frequently your situation changes, the higher this cost becomes.

TaskFlow aims to reduce exactly this step:

> **Less searching, less comparing, less hesitating.**

To move you from:

> **"What should I do?"**

more quickly into:

> **"Then let's do this."**

---

## 03 | What It Is

### TaskFlow is a workbench that moves from "tasks" toward "action."

It's not about building a new task system. What TaskFlow does is:

> **Let you look at these tasks from a different angle.**

Traditional task management focuses on:

> **What tasks do I have?**

TaskFlow focuses on:

> **Given my current situation, what can I do?**

So it's not merely a **Task Space** — it tries to build an **Action Space**.

From **managing tasks** toward **choosing action**.

| Dimension | Traditional Task Management (Task Space) | TaskFlow (Action Space) |
| --- | --- | --- |
| **Core Goal** | **Manage things** (afraid to forget) | **Drive action** (don't know what to start) |
| **Focus** | See all tasks (Task) | Focus on current action (Action) |
| **Brain's Role** | **Thinking engine** (What do I have to do?) | **Execution engine** (What do I do now?) |
| **Process** | Find task → Judge → Choose | Context → Filter → Act |
| **Outcome** | Cognitive overload, accumulating anxiety | **Eliminate friction, start immediately** |

---

## 04 | How It Solves It

TaskFlow doesn't try to decide the most important thing in your life for you. What it does is use the information already present in your tasks to help you **narrow down your choices**, putting tasks back into different action contexts:

- **GTD → What's the next step?**
  Helps you find the next actionable step from a chain of tasks.

- **Time → What should I do today?**
  Helps you find what truly needs to be faced today from a time perspective.

- **Tag → What should I do in this context?**
  Helps you find what fits right now based on your current work environment, tools, or situation.

So:

> **A task is no longer just a list item waiting to be completed, but an action that can be rediscovered based on context.**

The whole process shifts from:

**Task list → Browse → Judge → Compare → Choose**

to:

**Current context → Narrow down → Find action → Begin**

That is:

> **Context → Choice → Action**

---

## 05 | What You Get

What you end up with is not a more complex task system, but a lighter entry point to action.

You no longer need to face dozens of tasks each time and rethink:

> "What should I do now?"

Instead, you get a clear answer faster:

> **"Right now, I can do this."**

So:

**Fewer choices** → **Lower decision cost** → **Less action friction** → **Faster start** → **Easier to enter a state of sustained action**

The change TaskFlow ultimately wants to bring can be summed up in one sentence:

> **It's not about helping you manage more tasks, but helping you start the next thing faster.**

When you use TaskFlow, what you gain is not just a good-looking panel, but a qualitative shift in your entire workflow:

- **Zero decision paralysis, instant start**: The moment you open Obsidian, you no longer stare blankly at dozens of to-dos — you lock onto the most worthwhile thing to do right now at a glance.
- **Zero migration and learning cost**: Fully compatible with existing Tasks syntax and data. No change to your recording habits. Install and go.
- **Willpower relief, focused execution**: Minimize the drain of "picking tasks" and pour your valuable attention entirely into real "action."
- **Naturally enter Flow**: Use structured TaskFlow to eliminate action resistance, let tasks flow smoothly, and let your brain glide easily into focused flow.

---

## 06 | Core Narrative

> **More and more tasks → Harder and harder to choose → Higher and higher cost of action → TaskFlow makes "choosing what" simple → People get into action faster.**

> There can be hundreds of tasks, but the "next step" right now only needs one.
>
> **TaskFlow: From managing tasks to choosing action.**

---

## 07 | Installation Guide

> **TaskFlow is not yet available in the Obsidian Community Plugin store.** You'll need to install it manually using one of the two methods below.

---

### Method 1: Install via BRAT (Recommended)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) (Beta Reviewers Auto-update Tool) is a common tool in the Obsidian community for installing and auto-updating plugins that aren't in the store yet. Once installed via BRAT, the plugin can **automatically follow updates from the GitHub repository** — no manual downloads each time.

### Steps

1. **Install the BRAT plugin**
    - Open Obsidian → Settings → Community Plugins → Browse
    - Search for `BRAT`, find **Obsidian42 - BRAT**, click Install and Enable

2. **Add TaskFlow via BRAT**
    - Open the BRAT plugin
    - Click **Add Beta Plugin**
    - Paste the repository URL into the input field:
        `https://github.com/ichris007/obsidian-taskflow`
    - Click **Add Plugin**, and BRAT will automatically download and install the latest version

3. **Enable the plugin**
    - Go back to Settings → Community Plugins → Installed Plugins
    - Find **TaskFlow** and toggle it on

> 💡 From then on, whenever a new version is released, BRAT will automatically notify you or update it for you — no manual work needed.

---

### Method 2: Manual Installation

If you prefer not to use BRAT, you can also download the files directly from GitHub and place them in your plugin directory.

### Steps

1. **Download the plugin files**
    - Open the repository's Releases page:
        [https://github.com/ichris007/obsidian-taskflow/releases](https://github.com/ichris007/obsidian-taskflow/releases)
    - Download the following three files from the latest release:
        - `main.js`
        - `manifest.json`
        - `styles.css`

    > If there are no releases yet, you can also download these three files directly from the repository root (via Code → Download ZIP, or open each file and click Raw to save).

2. **Find your Obsidian plugin directory**
    - Open your Obsidian Vault folder
    - Navigate to `.obsidian/plugins/`
        (If you can't see the `.obsidian` folder, you'll need to enable "Show hidden files" in your system settings)

3. **Create the plugin folder and place the files**
    - Create a new folder inside `plugins` named: `taskflow`
    - Place the downloaded `main.js`, `manifest.json`, and `styles.css` into that folder
    - The final structure should be:
        ```
        .obsidian/plugins/taskflow/
        ├── main.js
        ├── manifest.json
        └── styles.css
        ```

4. **Enable the plugin**
    - Restart Obsidian (or press `Ctrl/Cmd + R` to reload)
    - Open Settings → Community Plugins → Installed Plugins
    - Find **TaskFlow** and toggle it on

---

## About the Author

**猎人科叔 (Hunter Keshu)**

- Tech industry talent expert, 15 years as a headhunter, Internet / AI / Robotics, interviewed over 10,000 people.
- Productivity systems expert, 16+ years of focus, building efficient work and growth systems.
- Same name across all social media: **猎人科叔**.

For more of Keshu's Obsidian productivity and knowledge management practices (sample vaults, plugins, scripts, experience, etc.), see <https://lifein.vip>.

---

## 📄 License

Please refer to the LICENSE file in the repository.

---

> **TaskFlow — From managing tasks to choosing action.**
