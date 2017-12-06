## Mongabay Conservation Visualization

D3 based app for visualizing evidence for and against conservation strategies (e.g. Forest Certification, Payments for Ecosystem Services, etc.), to accompany articles on [Mongabay.com](mongabay.com).

Articles: 
* [Does forest conservation really work?](https://news.mongabay.com/2017/09/does-forest-certification-really-work/)
* [Does community-based forest management work in the tropics?](https://news.mongabay.com/2017/11/does-community-based-forest-management-work-in-the-tropics/)
* [Cash for conservation: Do payments for ecosystem services work?](https://news.mongabay.com/2017/10/cash-for-conservation-do-payments-for-ecosystem-services-work/)

The app is designed to load data from arbitrary "strategies" simply by switching two data sources (`data/data.csv` and `data/lookup_strategy.csv`). 

### URLs and Servers
* **Staging**: GitHub pages (served from [docs/ folder](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/#publishing-your-github-pages-site-from-a-docs-folder-on-your-master-branch)), e.g.: https://mongabay.github.io/mongabay-conservationviz/?fsc
* **Production**: Amazon EC2 (see below)
* To switch between strategies, append a URL param representing the strategy acronym to the end of the root URL, e.g. `/?fsc`, `/?pes`, `/?cfm`, etc. 

### Data general
* Data spreadsheet: https://docs.google.com/spreadsheets/d/1OP_i8qOqFPdiO9_f-oXQJN3DIU4Fmvm6T5j8WnwrQR4/edit#gid=198979559
* Raw data is located in sheets named Data_strategy (e.g. Data_FSC, etc.)
* Main lookup, common to all strategies (`data/lookup.csv`), is located in sheet named Lookup
* Flattened data that drives the app as `data/{STRATEGY}/data.csv` is located in sheets named flattened_data_strategy (e.g. flattened_data_FSC)
* Strategy lookups (`data/{STRATEGY}/lookup_strategy.csv`) are located in sheets named lookup_strategy (e.g. lookup_strategy)

### Data update: Changing strategy and related data sources
* The app parses a strategy key from the URL, e.g. `https://mongabay.github.io/mongabay-conservationviz/?fsc`
* This key is used to switch to the correct data sub-directory in `data/`, e.g. `data/pes`, and to pull content from `config.js`
* If the URL is missing a valid strategy param, then the app defaults to whatever data is at the top level of `data/` (currently FSC)
* a more detailed explanation follows

### Detailed steps for a data update/new strategy

#### Import raw data
1. Come up with an acronym for the new strategy. There are no rules here, but to date we have been using 3-letter acronymns, e.g. `fsc`, `pes`, etc. We'll call the new strategy `new` for the examples below
2. Create three new tabs in the Google data sheet (see URL above): a raw data sheet (`Data_NEW`), a lookup (`lookup_new`), and a flattened data sheet (`flattened_data_new`)
3. Typically Mongabay will provide raw data in .ods format. Open this (Libre office, Open Office), and copy/paste or otherwise import into the raw data into `Data_NEW`, and the publications list into `lookup_new`
4. Check this new data against the raw data and lookup tabs for older strategies, adding keys and matching column order where necessary
5. Make sure countries are spelled consistently and listed in the main lookup; add new countries (and lat-lng values) where needed

#### Create flattened data in the Google Sheet
1. Use forumlas from previous strategies in the Google sheet that to help copy from the raw data tab (Data_NEW) to the flattened data tabl (flattened_data_new). Save this locally as `data.csv`
2. Using previous strategies as an example, format the strategy-specific lookup to hold lookup values and details. Save this locally as `lookup_strategy.csv` 
3. Open the project in your favorite text editor, and in the project files, create a subdirectory in `data` using the new strategy acronym
4. copy `data.csv` and `lookup_strategy.csv` into the new subdirectory

#### Config updates
1. Edit the file named `config.js`, adding entries everywhere you see strategy specific values. There are probably 10-15 of these in a section demarcated "Strategy-specific variables", with names like `fullscreen["cfm"]` and `articlelink['cfm']`. 
2. Add your strategy specific content and links in those new entries. 

#### Final steps
1. The next step is to sync the project with S3 (see below) so that the new data and edited config file are available on the server. 
2. From there, the project can be viewed directly on EC2 at https://mongabay-imgs.s3.amazonaws.com/vz/index.html?pes, just change the part after the `?` to whatever your new acronym is 

## S3 Hosting
Mongabay manages an S3 bucket that hosts the app. Although there are a variety of ways to manage data on S3, examples here use the excellent [Amazon AWS CLI](https://aws.amazon.com/cli/) to sync project files 

### AWS CLI installation via pip  
`pip install awscli --upgrade --user`

### S3 Config
There are a variety of ways to [configure the AWS CLI](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) on different operating systems. On Unix systems, you may include the following in the users home directory:
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
### AWS CLI commands

* The AWS SLI uses a Unix-like command-line syntax for listing, copying, moving and deleting files 
* See the AWS CLI [command reference](http://docs.aws.amazon.com/cli/latest/reference/) for a full description of available CLI commands 

```
// List the contents of the bucket
$ aws s3 ls s3://mongabay-imgs/vz/
```

```
// copy a single file
$ aws s3 cp readme.doc s3://mongabay-imgs/vz/
```

```
// sync and delete remote files no longer on localhost, append --dryrun to test
$ aws s3 sync . s3://mongabay-imgs/vz/ --delete --exclude ".git/*" --exclude "docs/*" --exclude "frame/*" --exclude ".gitignore" --exclude "readme.md" --dryrun 
$ aws s3 sync . s3://mongabay-imgs/vz/ --delete --exclude ".git/*" --exclude "docs/*" --exclude "frame/*" --exclude ".gitignore" --exclude "readme.md"
```

``` 
// copy all files from remote to local
aws s3 cp s3://mongabay-imgs/vz/ ./ --recursive 
```