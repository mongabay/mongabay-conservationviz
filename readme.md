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