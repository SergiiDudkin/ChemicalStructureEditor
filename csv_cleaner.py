import csv
import re


synthetic = {
    'Tc': 97,
    'Pm': 145,
    'Po': 209,
    'At': 210,
    'Rn': 222,
    'Fr': 223,
    'Ra': 226,
    'Ac': 227,
    'Np': 237,
    'Pu': 244,
    'Am': 243,
    'Cm': 247,
    'Bk': 247,
    'Cf': 251,
    'Es': 252,
    'Fm': 257,
    'Md': 258,
    'No': 259,
    'Lr': 266,
    'Rf': 267,
    'Db': 268,
    'Sg': 269,
    'Bh': 270,
    'Hs': 269,
    'Mt': 278,
    'Ds': 281,
    'Rg': 282,
    'Cn': 285,
    'Nh': 286,
    'Fl': 289,
    'Mc': 290,
    'Lv': 293,
    'Ts': 294,
    'Og': 294
}

src_file = 'PeriodicTable.csv'
with open(src_file, 'rt') as file:
    reader = csv.reader(file)
    data = list(reader)

for item in data:
    match = re.search(r'\[([\d.]+),([\d.]+)\]', item[1])
    if match is not None:
        num0 = float(match.group(1))
        num1 = float(match.group(2))
        item[1] = round((num0 + num1) / 2, 12)
    else:
        match = re.search(r'([\d.]+)\(\d+\)', item[1])
        if match is not None:
            item[1] = round(float(match.group(1)), 12)
        else:
            item[1] = synthetic[item[0]]

with open('clean_pt.csv', 'wt', newline='') as file:
    writer = csv.writer(file, quoting=csv.QUOTE_NONNUMERIC)
    writer.writerows(data)

