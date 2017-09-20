## Mongabay Conservation Visualization

D3 based app for visualizing evidence for and against conservation themes

The app is designed to load data from arbitrary "strategies" simply by switching two data sources (`data/data.csv` and `data/lookup_strategy.csv`). Currently we have data for two themes (Forest Certification [FSC] and Payments for Ecosystem Services [PES]). See below for details on updating. 

### Data general
* Data spreadsheet: https://github.com/GreenInfo-Network/mongabay-conservationviz/issues/46
* Raw data is located in sheets named Data_strategy (e.g. Data_FSC, etc.)
* Main lookup, common to all strategies (`data/lookup.csv`), is located in sheet named Lookup
* Flattened data that drives the app as `data/{STRATEGY}/data.csv` is located in sheets named flattened_data_strategy (e.g. flattened_data_FSC)
* Strategy lookups (`data/{STRATEGY}/lookup_strategy.csv`) are located in sheets named lookup_strategy (e.g. lookup_strategy)

### Switching between strategies and data sources
* The app parses a strategy key from the URL, e.g. `https://greeninfo-network.github.io/mongabay-conservationviz/?fsc`
* Current strategies are keyed as `?fsc` for Forest Certification and `?pes` for Payments for Ecosystem Services
* This key is used to switch to the correct sub-directory in `data/`, e.g. `data/pes`
* If the URL is missing a valid strategy param, then the app defaults to whatever data is at the top of `data/`

### When the client provides a raw data sheet:
- import it into a new raw data sheet
- create sheets for flattened_data_strategy and lookup_strategy
- use the formulas present in existing flattened and lookup sheets to create new flattened data and lookups
- download flattened data as `data.csv` and lookup as `lookup_strategy.csv` and place into the data sub-directory for this strategy, or create a new one if this is a new strategy (and add this key as a valid strategy, see the global Javascript var `strategies`)

### S3 Hosting
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
$ aws s3 ls s3://mongabayviz
```

```
// copy a file
$ aws s3 cp readme.doc s3://mongabayviz
```


```
// sync and delete remote files no longer on localhost, append --dryrun to test
$ aws s3 sync .s3://mongabayviz  --delete --exclude ".git/*" --dryrun 
$ aws s3 sync . s3://mongabayviz --delete --exclude ".git/*"
```
