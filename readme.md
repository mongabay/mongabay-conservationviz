## Mongabay Conservation Visualization

D3 based app for visualizing evidence for and against conservation themes

The app is designed to load data from arbitrary "strategies" simply by switching two data sources (`data/data.csv` and `data/lookup_strategy.csv`). Currently we have data for two themes (Forest Certification [FSC] and Payments for Ecosystem Services [PES]). See below for details on updating. 

### Data update
* Data spreadsheet: https://github.com/GreenInfo-Network/mongabay-conservationviz/issues/46
* Raw data is located in sheets named Data_strategy (e.g. Data_FSC, etc.)
* Flattened data that drives the app as `data/data.csv` is located in sheets named flattened_data_strategy (e.g. flattened_data_FSC)
* Main lookup (`data/lookup.csv`) is located in sheet named Lookup
* Strategy lookups (`data/lookup_strategy.csv`) are located in sheets named lookup_strategy (e.g. lookup_strategy)

When the client provides a raw data sheet:
- import it into a new raw data sheet
- create sheets for flattened_data_strategy and lookup_strategy
- use the formulas present in existing flattened and lookup sheets to create new flattened data and lookups
- download flattened data as `data.csv` and lookup as `lookup_strategy.csv` and place in the data directory