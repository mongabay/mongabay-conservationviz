## Mongabay Conservation Visualization

D3 based app for visualizing evidence for and against conservation themes

The app is designed to load data from arbitrary "strategies" simply by switching two data sources (`data/data.csv` and `data/lookup_strategy.csv`). 

### Servers
Staging from GitHub pages (served from [docs/ folder](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/#publishing-your-github-pages-site-from-a-docs-folder-on-your-master-branch)): https://mongabay.github.io/mongabay-conservationviz/?fsc
Production: Amazon EC2 (see below)

### Data general
* Data spreadsheet: https://docs.google.com/spreadsheets/d/1OP_i8qOqFPdiO9_f-oXQJN3DIU4Fmvm6T5j8WnwrQR4/edit#gid=198979559
* Raw data is located in sheets named Data_strategy (e.g. Data_FSC, etc.)
* Main lookup, common to all strategies (`data/lookup.csv`), is located in sheet named Lookup
* Flattened data that drives the app as `data/{STRATEGY}/data.csv` is located in sheets named flattened_data_strategy (e.g. flattened_data_FSC)
* Strategy lookups (`data/{STRATEGY}/lookup_strategy.csv`) are located in sheets named lookup_strategy (e.g. lookup_strategy)

### Data update: Changing strategy and related data sources
* The app parses a strategy key from the URL, e.g. `https://mongabay.github.io/mongabay-conservationviz/?fsc`
* Current strategies are keyed as `?fsc` for Forest Certification and `?pes` for Payments for Ecosystem Services
* This key is used to switch to the correct sub-directory in `data/`, e.g. `data/pes`
* If the URL is missing a valid strategy param, then the app defaults to whatever data is at the top level of `data/`
* iframe `src` needs to include a valid strategy to work. If not, it will default to FSC
* also important to update the `strategies[]` variable in `index.js`, `fullscreen\index.html` to include the new key
* a more detailed explanation follows

### Detailed steps for a data update/new strategy

#### Import raw data
1. Come up with an acronym for the new strategy. There are no rules here, but to date we have been using 3-letter acronymns, e.g. `fsc`, `pes`, etc. We'll call the new strategy `new` for the examples here.
2. Create three new tabs in the Google data sheet (see URL above): a raw data sheet (Data_NEW), a lookup (lookup_new), and a flattened data sheet (flattened_data_new)
3. Typically Mongabay will provide raw data in .ods format. Open this (Libre office, Open Office), and copy/paste or otherwise import into the raw data into Data_NEW, and the publications list into lookup_new
4. Check this new data against the raw data and lookup tabs for older strategies, adding keys and matching column order where necessary
5. Make sure countries are spelled consistently and listed in the main lookup; add new countries (and lat-lng values) where needed

#### Create flattened data in the Google Sheet
2. Use forumlas from previous strategies in the Google sheet that to help copy from the raw data tab (Data_NEW) to the flattened data tabl (flattened_data_new). Save this locally as `data.csv`
3. Using previous strategies as an example, format the strategy-specific lookup to hold lookup values and details. Save this locally as `lookup_strategy.csv` 
4. Open the project in your favorite text editor, and in the project files, create a subdirectory in `data` using the new strategy acronym
5. copy `data.csv` and `lookup_strategy.csv` into the new subdirectory

#### Config updates
1. Edit the file named `config.js`, adding entries everywhere you see strategy specific values. There are probably 10-15 of these in a section demarcated " Strategy-specific variables", with names like `fullscreen["cfm"]` and `articlelink['cfm']`. 
2. Add your strategy specific content and links in those new entries. 

#### Final steps
1. The next step is to sync the project with S3 (see below) so that the new data and edited config file are available on the server. 
2. From there, the project can be viewed directly on EC2 at https://mongabay-imgs.s3.amazonaws.com/vz/index.html?pes, just change the part after the `?` to whatever your new acronym is 

## S3 Hosting
Mongabay manages an S3 bucket that hosts the app. To recursively copy files: 
This requires the setup of s3 CLI tools on the localhost (via pip)
`pip install awscli --upgrade --user`

### S3 Config
See details for latest version of AWS CLI. Current setup requires the following in the users home directory:
```
# ~/.aws/config
[default]
region = us-west-1
```
```
# ~/.aws/creadentials
[default]
user=someuser
aws_access_key_id=ACCESSKEY
aws_secret_access_key=SECRETKEY
```
### S3 CLI commands
```
// List the contents of my-bucket
$ aws s3 ls s3://mongabay-imgs/vz/
```

```
// copy a single file
$ aws s3 cp readme.doc s3://mongabay-imgs/vz/
```

```
// sync and delete remote files no longer on localhost, append --dryrun to test
$ aws s3 sync . s3://mongabay-imgs/vz/  --delete --exclude ".git/*" --dryrun 
$ aws s3 sync . s3://mongabay-imgs/vz/  --delete --exclude ".git/*" --exclude "docs/*" --exclude "frame/*" --exclude ".gitignore" --exclude "readme.md"
```

``` copy all files from remote to local
aws s3 cp s3://mongabay-imgs/vz/ ./ --recursive 
```