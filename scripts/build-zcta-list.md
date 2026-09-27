# Regenerating the county ZCTA list

`services/etl/src/data/harris-zctas.json` lists every ZCTA that overlaps Harris County (FIPS 48201).

**Official source:** U.S. Census Bureau, 2020 ZCTA to County Relationship File
`https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt`
(pipe-delimited; columns include `GEOID_ZCTA5_20` and `GEOID_COUNTY_20`).

On a machine with normal internet access:

```bash
curl -sO https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt
node -e '
const fs=require("fs");const [h,...rows]=fs.readFileSync("tab20_zcta520_county20_natl.txt","utf8").trim().split(/\r?\n/);
const c=h.split("|");const iz=c.indexOf("GEOID_ZCTA5_20"),ic=c.indexOf("GEOID_COUNTY_20");
const byZ=new Map();for(const r of rows){const f=r.split("|");if(!f[iz])continue;(byZ.get(f[iz])??byZ.set(f[iz],new Set()).get(f[iz])).add(f[ic]);}
const COUNTY=process.argv[1]||"48201";const z=[...byZ].filter(([,s])=>s.has(COUNTY)).map(([k])=>k).sort();
console.log(JSON.stringify({county_fips:COUNTY,zctas:z,also_in_other_counties:z.filter(k=>byZ.get(k).size>1)},null,1))' 48201
```

The committed list was built on 2026-09-26 from the same Census file as packaged in the `zctaCrosswalk` R package (143 ZCTAs, 22 shared with another county), because the build environment could not reach census.gov directly. Rerun the command above to confirm it matches.
