#!/usr/bin/python

import csv
import sys
import json
from pycorenlp import StanfordCoreNLP

STANFORD_NLP_PORT = 9000

nlp = StanfordCoreNLP('http://localhost:{}'.format(STANFORD_NLP_PORT))

document_groupby = sys.argv[1]
record_groupby = sys.argv[2]
annotation_field = sys.argv[3]
input_files = sys.argv[4].split(",")
input_file_types = sys.argv[5].split(",")
output_dir = sys.argv[6]

def process_csv_files():
    D = dict()
    for i in range(len(input_files)):
        process_csv_file(input_files[i], D, input_file_types[i])
    return D

def process_csv_file(file_path, D, file_type):
    f = open(file_path, 'rt')
    try:
        reader = csv.DictReader(f, delimiter=',')
        for record in reader:
            process_record(record, D, file_type)
    finally:
        f.close()
    return D

def process_record(record, D, record_type):
    D_sub = D
    if record[document_groupby] not in D_sub:
        D_sub[record[document_groupby]] = dict()
    D_sub = D_sub[record[document_groupby]]

    if record[record_groupby] not in D_sub:
        D_sub[record[record_groupby]] = []
    D_sub = D_sub[record[record_groupby]]

    sub_record = dict()
    for key in record:
        if key != document_groupby and key != record_groupby:
            if key == "time":
                sub_record[key] = int(record[key])
            else:
                sub_record[key] = record[key]
    sub_record["type"] = record_type
    annotate_record(sub_record)
    D_sub.append(sub_record)


def annotate_record(record):
    if annotation_field in record:
        record[annotation_field + "_" + "anno"] = annotate_text(record[annotation_field])

# Borrowed from https://github.com/futurulus/coop-nets/blob/master/behavioralAnalysis/tagPOS.ipynb
def annotate_text(text):
    if not isinstance(text, basestring):
        print '%s: %s' % (type(text), str(text))
    try:
        if text.strip() == '':
            return []

        #text = str(text)
        ann = nlp.annotate(
            text,
            properties={'annotators': 'pos,lemma',
                        'outputFormat': 'json'})
        words = []
        lemmas = []
        pos = []
        if isinstance(ann, basestring):
            ann = json.loads(ann.replace('\x00', '?').encode('latin-1'), encoding='utf-8', strict=True)
        for sentence in ann['sentences']:
            s_words = []
            s_lemmas = []
            s_pos = []
            for token in sentence['tokens']:
                s_words.append(token['word'])
                s_lemmas.append(token['lemma'])
                s_pos.append(token['pos'])
            words.append(s_words)
            lemmas.append(s_lemmas)
            pos.append(s_pos)

        anno_obj = dict()
        anno_obj["words"] = words
        anno_obj["lemmas"] = lemmas
        anno_obj["pos"] = pos

        return anno_obj
    except Exception as e:
        print text
        raise

def output_obj(file_path, obj):
    f = open(file_path, 'w')
    try:
        f.write(json.dumps(obj))
    finally:
        f.close()

def output_record_files(D):
    for key in D:
        records = D[key]
        record_keys = [str(ikey) for ikey in sorted([int(rkey) for rkey in records.keys()])]
        records_list = []
        for record_key in record_keys: # A record key is usually the number for a round
            record = dict()
            record[record_groupby] = int(record_key)
            record["events"] = sorted(records[record_key], key=lambda x: x["time"])
            records_list.append(record)
        document_obj = dict()
        document_obj[document_groupby] = key
        document_obj["records"] = records_list
        output_obj(output_dir + "/" + key, document_obj)

output_record_files(process_csv_files())
