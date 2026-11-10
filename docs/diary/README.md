# Diaries

One file per team member. Your agent writes in yours, and only in yours. Because nobody else writes in your file, two people's diaries can never collide when their branches are merged.

| File | Whose |
|---|---|
| `catarina.md` | Catarina |
| `fran.md` | Fran. Create it with your first entry |
| `pedro.md` | Pedro. Create it with your first entry |
| `rodrigo.md` | Rodrigo. Create it with your first entry |

`docs/build-diary.md`, one folder up, is the diary of the first day, 10 November 2026, when the base was built on Catarina's laptop. It also has the list of words used in all the diaries. Read it for the history. New entries go into the personal files.

## How to write an entry

Add the newest entry at the top of your file, in plain language, after each piece of work. Someone who was not there should be able to follow it.

```
### 12 November 2026: what this entry is about

**What was done**
Two or three sentences, and a small table of the files that changed and what each is for.

**Why it was done this way**

**Decisions**
Anything the agent chose that the brief leaves open, marked
"Decision made by the agent, please confirm".

**What was checked, and what was not**
Which tests and checks were really run, with their results. Say plainly what was NOT checked.

**How to check it yourself**

**What comes next**
```

The part people skip, and should not, is "what was not checked". On the first day that line is what led to finding a problem on the live server.

## At the end of the project

The four diaries together are the history of the project. Before the presentation, each of us reads the other three, so that anyone can answer questions about any part. `WALKTHROUGH.md` is the summary and the diaries are the detail behind it.
