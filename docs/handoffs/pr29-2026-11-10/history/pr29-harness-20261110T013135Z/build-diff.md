## codegraph build edge diff

old `/tmp/codegraph-pr29-harness-6fevujfy/baseline/dist/bin/codegraph.js` → new `/tmp/codegraph-pr29-harness-6fevujfy/candidate/dist/bin/codegraph.js`

| repo | verdict | edges old → new | edges −/+ | nodes −/+ | unresolved −/+ |
|---|---|---|---|---|---|
| requests | SAME | 2976 → 2976 | 0 | 0 | 0 |
| click | SAME | 7770 → 7770 | 0 | 0 | 0 |
| mux | SAME | 1921 → 1921 | 0 | 0 | 0 |
| ky | SAME | 5278 → 5278 | 0 | 0 | 0 |
| express | DIFFER | 2334 → 2270 | −64 / +0 | 0 | −0 / +64 |

<details><summary>express: first 4 of 64 differing edges (old count → new count)</summary>

```
1 -> 0  ["calls",21,8,"express.urlencoded","import",null,"examples/auth/index.js","examples/auth/index.js","javascript","file","function","createApplication","createApplication","lib/express.js",36,56,"index.js",1,135]
1 -> 0  ["calls",12,24,"users.map","import",null,"examples/content-negotiation/index.js","examples/content-negotiation/index.js","javascript","file","variable","users","users","examples/content-negotiation/db.js",3,3,"index.js",1,47]
1 -> 0  ["calls",18,15,"users.map","import",null,"examples/content-negotiation/index.js","examples/content-negotiation/index.js","javascript","file","variable","users","users","examples/content-negotiation/db.js",3,3,"index.js",1,47]
1 -> 0  ["calls",6,20,"users.map","import",null,"examples/content-negotiation/users.js","html","javascript","function","variable","users","users","examples/content-negotiation/db.js",3,3,"html",5,9]
```

</details>
