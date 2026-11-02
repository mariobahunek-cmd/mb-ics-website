#!/usr/bin/env python3
"""Generate the German one-page profile from the maintained localized facts.
Requires reportlab. The original accepted English PDF is preserved.
"""
from pathlib import Path
import json,html,functools
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import BaseDocTemplate,Frame,PageTemplate,Paragraph,Spacer,Table,TableStyle,FrameBreak
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.colors import HexColor,white
from reportlab.lib.pagesizes import A4
R=Path(__file__).resolve().parents[1];f=json.loads((R/'_data/public_facts_localized.json').read_text())['de']
out=R/'de/trainer-profile/mario-bahunek-sap-trainerprofil.pdf';out.parent.mkdir(parents=True,exist_ok=True)
def clean(s):return html.escape(str(s)).replace('–','-').replace('—','-').replace('‑','-').replace('…','...')
navy=HexColor('#173451');gray=HexColor('#4d5b6d')
styles=getSampleStyleSheet();styles.add(ParagraphStyle(name='BodyDE',fontName='Helvetica',fontSize=8.3,leading=10.6,textColor=navy,spaceAfter=6));styles.add(ParagraphStyle(name='SmallDE',parent=styles['BodyDE'],fontSize=7.5,leading=9.4));styles.add(ParagraphStyle(name='HeadDE',fontName='Helvetica-Bold',fontSize=10.4,leading=13,textColor=navy,spaceBefore=9,spaceAfter=5));styles.add(ParagraphStyle(name='TableDE',parent=styles['SmallDE'],spaceAfter=0))
def P(s,style='BodyDE'):return Paragraph(s,styles[style])
def header(c,doc):
 c.setTitle('Mario Bahunek - SAP-Trainerprofil');c.setAuthor('Mario Bahunek');c.setFillColor(navy);c.setFont('Helvetica-Bold',24);c.drawString(40,806,'Mario Bahunek');c.setFont('Helvetica',11);c.drawString(40,788,'Unabhängiger SAP-S/4HANA-Trainer | MM und Einkauf');c.setFont('Helvetica',8.3);c.drawString(40,772,'Deutsch (Muttersprache) · Englisch · Spanisch | mario@mb-ics.com');c.drawString(40,759,'mb-ics.com/de/trainer-profile/ | Stand '+f['as_of']);c.linkURL('https://mb-ics.com/de/trainer-profile/',(40,755,225,768));c.setStrokeColor(navy);c.setLineWidth(1.5);c.line(40,748,555,748);c.setFont('Helvetica',6.7);c.setFillColor(gray);c.drawString(40,36,'Quellen: Firmen-CV Oktober 2026, vorliegende Qualifikationsunterlagen, Originalauswertung und Eigenangaben vom 02.11.2026.');c.drawString(40,25,'Unabhängiges Training; weder von SAP SE angeboten noch empfohlen. SAP und SAP S/4HANA sind Marken der SAP SE.')
doc=BaseDocTemplate(str(out),pagesize=A4,leftMargin=40,rightMargin=40,topMargin=105,bottomMargin=50)
frames=[Frame(40,52,247,685,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0),Frame(307,52,248,685,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)]
doc.addPageTemplates(PageTemplate(id='TwoColumns',frames=frames,onPage=header))
story=[P('Training für Unternehmen und Bildungsträger: praktische Übungen, Prozessverständnis und Zertifizierungsvorbereitung. Schwerpunkt MM und Einkauf. Frühere SAP-SE-Tätigkeit im Lösungsvertrieb, keine daraus abgeleitete Implementierungsprojekterfahrung.'),P('Trainingsthemen','HeadDE')]
for x in f['portfolio']:story.append(P('<b>'+clean(x['area'])+'</b><br/>'+clean(x['scope'])))
story.append(P('Dokumentierte Qualifikationen','HeadDE'))
for x in f['qualifications']:story.append(P('<b>'+clean(x['title'])+'</b><br/>'+clean(x['detail']),'SmallDE'))
story.append(P('Beruflicher Hintergrund','HeadDE'))
for x in f['career'][:2]:story.append(P('<b>'+clean(x['role'])+'</b><br/>'+clean(x['organization'])+' · '+clean(x['period']),'SmallDE'))
story += [FrameBreak(),P('Historische Kursauswertung','HeadDE'),P('Auswertungsbild, laut Mario von COMCAVE. Anbieterursprung nicht unabhängig bestätigt. Antwortverteilungen am 02.11.2026 nachgerechnet.','SmallDE')]
rows=[[P('<b>Frage</b>','TableDE'),P('<b>Ergebnis</b>','TableDE'),P('<b>Antworten</b>','TableDE')]]
for x in f['feedback']['items']:rows.append([P(clean(x['question']),'TableDE'),P(clean(x['result']),'TableDE'),P(str(x['n']),'TableDE')])
table=Table(rows,colWidths=[112,90,46]);table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,0),(-1,-1),.4,HexColor('#d5dde6')),('BACKGROUND',(0,0),(-1,0),HexColor('#edf2f7'))]));story.extend([table,Spacer(1,7),P('Vorbereitung, Struktur, Fachkompetenz und Didaktik: Noten 1-6 (1 beste Note). Einbindung und Zeit: Ja/Nein. Vorbereitung 1,07 = (100 + 12 + 3) / 107, gerundet. Keine Gesamttrainernote; Stichproben sind Antworten, keine eindeutigen Personen.','SmallDE'),P('Erhebungszeitraum unbekannt. Das Datum im Dateinamen ist kein Beleg dafür. <link href="'+f['feedback']['source_url']+'" color="#204e85">Originalauswertung</link> · <link href="https://mb-ics.com/de/trainer-profile/#track-record" color="#204e85">Kontext und Berechnungen</link>.','SmallDE'),P('Getrennte Eigenangaben','HeadDE'),P(clean(f['exam_statement']),'SmallDE'),P(clean(f['participant_statement']),'SmallDE'),P('Vor dem Auftrag vereinbaren','HeadDE'),P(clean(f['logistics']),'SmallDE'),P('<b>MB International Contracting Service LLC</b><br/>Fort Lauderdale, Florida, USA (Firmensitz)<br/><link href="https://mb-ics.com/de/?inquiry=corporate#contact" color="#204e85">Trainingsbedarf besprechen</link>')])
doc.build(story,canvasmaker=functools.partial(Canvas,invariant=1));print(out)
