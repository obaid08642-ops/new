"""Sub-split MedicalJobsScreen (shell + tab/overlay components via ctx)."""
import io
import os

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'provider-app',
                 'src', 'screens', 'shared', 'shared')
P = os.path.join(D, 'MedicalJobsScreen.tsx')
lines = io.open(P, encoding='utf8').read().split('\n')
L = lambda n: lines[n - 1]  # 1-indexed


def rng(a, b):
    return lines[a - 1:b]


assert L(30).startswith('export function MedicalJobsScreen'), L(30)
assert L(289).strip() == 'if (selectedJob && !applyVisible) {', L(289)
assert L(363).strip() == 'if (selectedJob && applyVisible) {', L(363)
assert L(436).strip() == 'if (selectedApp) {', L(436)
assert L(465).strip() == 'return (', L(465)
assert "{tab === 'browse' && (" in L(493), L(493)
assert "{tab === 'post' && (" in L(550), L(550)
assert "{tab === 'inbox' && isGuest && (" in L(649), L(649)
assert "{tab === 'inbox' && !isGuest && (" in L(677), L(677)
assert L(547).strip() == ')}', L(547)
assert L(646).strip() == ')}', L(646)
assert L(676).strip() == ')}', L(676)
assert L(706).strip() == ')}', L(706)
assert 'FILTERS SHEET' in L(708), L(708)
assert L(731).strip() == '});' or L(731).strip() in ('}', '});', '}', ');'), L(731)

header = rng(1, 29)
state = rng(31, 285)
detail = rng(289, 359)
apply = rng(363, 432)
applicant = rng(436, 461)
main_head = rng(465, 492)
browse = rng(494, 546)
post = rng(551, 646)
inbox_guest = rng(650, 675)
inbox_user = rng(678, 705)
filters_tail = rng(707, 731)
drug_section = rng(732, len(lines))

CTX_NAMES = ('theme, lang, AR, show, user, insets, onBack, onOpenChat, tab, setTab, postType, setPostType, '
 'search, setSearch, showFilters, setShowFilters, selectedJob, setSelectedJob, selectedApp, setSelectedApp, '
 'filterProf, setFilterProf, filterCity, setFilterCity, postTitle, setPostTitle, postProf, setPostProf, '
 'postClass, setPostClass, postContract, setPostContract, postNat, setPostNat, postExp, setPostExp, '
 'postDesc, setPostDesc, postContact, setPostContact, postPhone, setPostPhone, postCompany, setPostCompany, '
 'postSalary, setPostSalary, applyVisible, setApplyVisible, applyName, setApplyName, applyPhone, setApplyPhone, '
 'applyClass, setApplyClass, applyExp, setApplyExp, applyReady, setApplyReady, applyCV, setApplyCV, '
 'guestId, guestMine, isGuest, applyCvUrl, applyScfhs, setApplyScfhs, applyScfhsExp, setApplyScfhsExp, '
 'uploadingCV, jobs, loading, posting, postCity, setPostCity, applications, inboxLoading, filtered, '
 'handlePost, handleApply')


def comp(name, body_lines, wrap=True):
    if not wrap:
        return header + ['', 'export function %s({ ctx }: any) {' % name,
                         '  const { %s } = ctx;' % CTX_NAMES] + \
            ['  ' + l if l.strip() else l for l in body_lines] + ['  return null;', '}', '']
    return header + ['', 'export function %s({ ctx }: any) {' % name,
                     '  const { %s } = ctx;' % CTX_NAMES, '  return (', '    <>'] + \
        ['    ' + l for l in body_lines] + ['    </>', '  );', '}', '']


def write(name, content):
    io.open(os.path.join(D, name + '.tsx'), 'w', encoding='utf8').write('\n'.join(content) + '\n')


write('MedicalJobsBrowseTab', comp('MedicalJobsBrowseTab', browse))
write('MedicalJobsPostTab', comp('MedicalJobsPostTab', post))
write('MedicalJobsInboxTab', comp('MedicalJobsInboxTab', inbox_guest + [''] + inbox_user))
write('MedicalJobsDetail', comp('MedicalJobsDetail', detail, wrap=False))
write('MedicalJobsApplicant', comp('MedicalJobsApplicant', apply + [''] + applicant, wrap=False))

shell = (header + ['',
  "import { MedicalJobsBrowseTab } from './MedicalJobsBrowseTab';",
  "import { MedicalJobsPostTab } from './MedicalJobsPostTab';",
  "import { MedicalJobsInboxTab } from './MedicalJobsInboxTab';",
  "import { MedicalJobsDetail } from './MedicalJobsDetail';",
  "import { MedicalJobsApplicant } from './MedicalJobsApplicant';",
  ''] + state + ['',
  '  const ctx: any = { %s };' % CTX_NAMES,
  '  if (selectedJob && !applyVisible) { return <MedicalJobsDetail ctx={ctx} />; }',
  '  if (selectedJob && applyVisible) { return <MedicalJobsApplicant ctx={ctx} />; }',
  '  if (selectedApp) { return <MedicalJobsApplicant ctx={ctx} />; }',
  ''] + main_head + [
  "      {tab === 'browse' && <MedicalJobsBrowseTab ctx={ctx} />}",
  "      {tab === 'post' && <MedicalJobsPostTab ctx={ctx} />}",
  "      {tab === 'inbox' && <MedicalJobsInboxTab ctx={ctx} />}",
  ''] + filters_tail + [''] + drug_section)
io.open(P, 'w', encoding='utf8').write('\n'.join(shell))
print('sub-split done')
