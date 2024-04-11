import csv
import json

src_file = 'clean_pt.csv'
with open(src_file, 'rt') as file:
    reader = csv.reader(file)
    data = list(reader)

for item in data:
    if '.' in item[1]:
        item[1] = float(item[1])
    else:
        item[1] = int(item[1])

dst_file = 'periodic_table.json'
with open(dst_file, 'wt') as file:
    json.dump(dict(data), file, indent=4)
