document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const totalNumbersInput = document.getElementById('total-numbers');
    const rosterList = document.getElementById('roster-list');
    const rowsInput = document.getElementById('rows');
    const colsInput = document.getElementById('cols');
    const btnRandomize = document.getElementById('btn-randomize');
    const btnSequential = document.getElementById('btn-sequential');
    const btnClearSeats = document.getElementById('btn-clear-seats');
    const btnReset = document.getElementById('btn-reset');
    const btnPrint = document.getElementById('btn-print');
    const deskGrid = document.getElementById('desk-grid');
    const viewToggle = document.getElementById('view-toggle');
    const classroomArea = document.getElementById('classroom-area');
    const classroomBoardWrapper = document.getElementById('classroom-board-wrapper');
    const classTitleInput = document.getElementById('class-title-input');
    const printClassTitle = document.getElementById('print-class-title');
    let draggedDesk = null;
    let selectedDesk = null; /* 터치 및 클릭 투 스왑을 위한 선택 변수 */

    classTitleInput.addEventListener('input', () => {
        const val = classTitleInput.value.trim();
        if(val !== '') {
            printClassTitle.textContent = val + ' 자리 배치표';
        } else {
            printClassTitle.textContent = '자리 배치표';
        }
    });

    viewToggle.addEventListener('change', (e) => {
        if(e.target.checked) {
            classroomBoardWrapper.classList.add('teacher-view');
        } else {
            classroomBoardWrapper.classList.remove('teacher-view');
        }
    });

    function shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    function swapDeskContent(el1, el2) {
        // 내부 내용(명찰 정보) 교환
        const back1 = el1.querySelector('.desk-back');
        const back2 = el2.querySelector('.desk-back');
        const tempHTML = back1.innerHTML;
        back1.innerHTML = back2.innerHTML;
        back2.innerHTML = tempHTML;

        // 명찰 관련 클래스(빈자리, 장식용 클래스 등) 교환
        const tempBackClass = back1.className;
        back1.className = back2.className;
        back2.className = tempBackClass;

        // 부모(책상)의 빈자리 상태 클래스 교환
        const isEmpty1 = el1.classList.contains('is-empty');
        const isEmpty2 = el2.classList.contains('is-empty');
        const isExtra1 = el1.classList.contains('is-extra');
        const isExtra2 = el2.classList.contains('is-extra');
        
        if (isEmpty1) el1.classList.remove('is-empty');
        if (isEmpty2) el2.classList.remove('is-empty');
        if (isExtra1) el1.classList.remove('is-extra');
        if (isExtra2) el2.classList.remove('is-extra');

        if (isEmpty1) el2.classList.add('is-empty');
        if (isEmpty2) el1.classList.add('is-empty');
        if (isExtra1) el2.classList.add('is-extra');
        if (isExtra2) el1.classList.add('is-extra');
    }

    function buildRosterList() {
        const total = parseInt(totalNumbersInput.value, 10) || 30;
        
        const existingData = [];
        document.querySelectorAll('.roster-slot').forEach(slot => {
            existingData.push({
                name: slot.querySelector('.slot-name').value,
                missing: slot.querySelector('.slot-missing-checkbox').checked
            });
        });

        rosterList.innerHTML = '';

        for (let i = 0; i < total; i++) {
            const slot = document.createElement('div');
            slot.className = 'roster-slot';
            
            const prevData = existingData[i] || { name: '', missing: false };
            if (prevData.missing) {
                slot.classList.add('is-missing');
            }

            slot.innerHTML = `
                <span class="slot-num">${i + 1}</span>
                <input type="text" class="slot-name" placeholder="이름 입력" value="${prevData.name}">
                <label class="slot-missing-label">
                    <input type="checkbox" class="slot-missing-checkbox" ${prevData.missing ? 'checked' : ''}>
                    결번
                </label>
            `;

            const checkbox = slot.querySelector('.slot-missing-checkbox');
            const nameInput = slot.querySelector('.slot-name');

            if (prevData.missing) {
                nameInput.disabled = true;
            }

            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    slot.classList.add('is-missing');
                    nameInput.value = ''; 
                    nameInput.disabled = true;
                } else {
                    slot.classList.remove('is-missing');
                    nameInput.disabled = false;
                }
            });

            nameInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = (e.clipboardData || window.clipboardData).getData('text');
                const pastedNames = pasteData.split(/\r?\n/).map(n => n.trim()).filter(n => n.length > 0);
                
                const allSlots = Array.from(rosterList.querySelectorAll('.roster-slot'));
                const currentIndex = allSlots.indexOf(slot);
                
                const validInputs = allSlots.slice(currentIndex)
                    .filter(s => !s.querySelector('.slot-missing-checkbox').checked)
                    .map(s => s.querySelector('.slot-name'));

                pastedNames.forEach((name, idx) => {
                    if (validInputs[idx]) {
                        const match = name.match(/^\d+[.\s_-]+(.*)/);
                        validInputs[idx].value = match ? match[1].trim() : name;
                    }
                });
            });

            rosterList.appendChild(slot);
        }
    }

    function buildInitialGrid() {
        const rows = parseInt(rowsInput.value, 10);
        const cols = parseInt(colsInput.value, 10);

        if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) return;

        deskGrid.innerHTML = '';
        /* minmax(0, 1fr) 속성이 있어야 아무리 많은 줄을 생성하더라도 종이 1장(height) 한계치를 넘지 않고 알아서 찌그러집니다 */
        deskGrid.style.setProperty('--cols', cols);
        deskGrid.style.setProperty('--rows', rows); // 세로 칸 수 변수 추가 주입
        deskGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        deskGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`; // JS에서도 유동적 높이 지원

        const totalSeats = rows * cols;

        for (let i = 0; i < totalSeats; i++) {
            const desk = document.createElement('div');
            desk.className = 'desk';
            
            desk.innerHTML = `
                <div class="desk-inner">
                    <div class="desk-front"></div>
                    <div class="desk-back"></div>
                </div>
            `;
            desk.addEventListener('click', () => {
                // 뽑기가 아직 안되었거나 카드가 뒤집히지 않은 빈 공간 클릭시 (기둥 처리 등)
                if (!desk.classList.contains('flipped')) {
                    desk.classList.toggle('is-empty');
                    return;
                }
                
                // 뽑기 이후: 터치/클릭을 통해 두 카드를 맞교환 (드래그 대신 쉽게 색상으로 표시)
                if (!selectedDesk) {
                    selectedDesk = desk;
                    desk.classList.add('selected-swap');
                } else {
                    if (selectedDesk === desk) {
                        selectedDesk.classList.remove('selected-swap');
                        selectedDesk = null; /* 같은 자리 취소 */
                        return;
                    }
                    
                    const targetDesk = desk;
                    targetDesk.classList.add('selected-swap');
                    
                    // 직관적인 시각적 딜레이 후 교체 (애니메이션 찰나 느낌)
                    setTimeout(() => {
                        swapDeskContent(selectedDesk, targetDesk);
                        
                        selectedDesk.classList.remove('selected-swap');
                        targetDesk.classList.remove('selected-swap');
                        
                        // 두 자리가 무사히 바뀌었다는 녹색 점멸(플래시) 짧게 보여주기
                        selectedDesk.classList.add('swap-flash');
                        targetDesk.classList.add('swap-flash');
                        
                        const sD = selectedDesk;
                        const tD = targetDesk;
                        setTimeout(() => {
                            sD.classList.remove('swap-flash');
                            tD.classList.remove('swap-flash');
                        }, 500);
                        
                        selectedDesk = null;
                    }, 250);
                }
            });

            desk.draggable = true;

            desk.addEventListener('dragstart', (e) => {
                if (!desk.classList.contains('flipped')) {
                    e.preventDefault();
                    return;
                }
                draggedDesk = desk;
                desk.classList.add('dragging'); 
                e.dataTransfer.effectAllowed = 'move';
            });

            desk.addEventListener('dragover', (e) => {
                e.preventDefault(); 
                if (draggedDesk !== desk && desk.classList.contains('flipped')) {
                    e.dataTransfer.dropEffect = 'move';
                }
            });

            desk.addEventListener('dragenter', (e) => {
                e.preventDefault();
                if (draggedDesk && draggedDesk !== desk && desk.classList.contains('flipped')) {
                    desk.classList.add('drag-over');
                }
            });

            desk.addEventListener('dragleave', (e) => {
                // 드래그가 실제로 칸 밖으로 나갔을 때만 제거
                desk.classList.remove('drag-over'); 
            });

            desk.addEventListener('drop', (e) => {
                e.preventDefault();
                desk.classList.remove('drag-over');
                
                if (draggedDesk && draggedDesk !== desk && desk.classList.contains('flipped')) {
                    swapDeskContent(draggedDesk, desk);
                }
            });

            desk.addEventListener('dragend', () => {
                desk.classList.remove('dragging');
                draggedDesk = null;
                document.querySelectorAll('.desk').forEach(d => d.classList.remove('drag-over'));
            });

            deskGrid.appendChild(desk);
        }
    }

    function getActiveStudents() {
        const slots = document.querySelectorAll('.roster-slot');
        const students = [];
        
        slots.forEach(slot => {
            const isMissing = slot.querySelector('.slot-missing-checkbox').checked;
            const name = slot.querySelector('.slot-name').value.trim();
            const num = slot.querySelector('.slot-num').textContent;
            
            if (!isMissing && name.length > 0) {
                students.push({ num: num, name: name });
            }
        });
        return students;
    }

    function assignSeats(isRandom) {
        let students = getActiveStudents();

        if (students.length === 0) {
            alert("이름이 입력된 올바른 학생이 1명도 없습니다.");
            return;
        }

        const rows = parseInt(rowsInput.value, 10);
        const cols = parseInt(colsInput.value, 10);
        const allDesks = Array.from(deskGrid.querySelectorAll('.desk'));
        
        allDesks.forEach(desk => {
            desk.classList.remove('flipped');
            const back = desk.querySelector('.desk-back');
            back.innerHTML = '';
            back.className = 'desk-back';
        });

        setTimeout(() => {
            let orderedDesks = [];
            
            if (isRandom) {
                orderedDesks = [...allDesks];
            } else {
                const dir = document.getElementById('seq-direction').value;
                const start = document.getElementById('seq-start').value;
                
                // 선생님 시점일 경우, 앞자리(칠판쪽=0번행)부터 시작하는 대전제는 유지해야 함.
                // 다만 180도 회전되어 있으므로 교사 기준 시각적 '왼쪽'은 프로그램 좌표상으론 '오른쪽'임.
                // 그러므로 거꾸로 뒤집는(reverse) 대신 좌/우 시작점만 서로 스왑해줌!
                let effectiveStart = start;
                if (classroomBoardWrapper.classList.contains('teacher-view')) {
                    effectiveStart = (start === 'left') ? 'right' : 'left';
                }
                
                if (dir === 'horizontal') {
                    for (let r = 0; r < rows; r++) {
                        if (effectiveStart === 'left') {
                            for (let c = 0; c < cols; c++) orderedDesks.push(allDesks[r * cols + c]);
                        } else {
                            for (let c = cols - 1; c >= 0; c--) orderedDesks.push(allDesks[r * cols + c]);
                        }
                    }
                } else {
                    if (effectiveStart === 'left') {
                        for (let c = 0; c < cols; c++) {
                            for (let r = 0; r < rows; r++) orderedDesks.push(allDesks[r * cols + c]);
                        }
                    } else {
                        for (let c = cols - 1; c >= 0; c--) {
                            for (let r = 0; r < rows; r++) orderedDesks.push(allDesks[r * cols + c]);
                        }
                    }
                }
            }

            let validDesksList = orderedDesks.filter(desk => !desk.classList.contains('is-empty'));

            if (students.length > validDesksList.length) {
                alert(`입력된 실제 인원(${students.length}명)이 마련된 일반 자리(${validDesksList.length}개)보다 많습니다.\n'✖ 제외됨(투표 취소칸)'을 클릭해 풀거나 설정된 칸을 늘리세요.`);
                return;
            }

            if (students.length < validDesksList.length) {
                const diff = validDesksList.length - students.length;
                for (let i = 0; i < diff; i++) {
                    const extraDesk = validDesksList[validDesksList.length - 1 - i];
                    extraDesk.classList.add('is-empty');
                    extraDesk.classList.add('is-extra'); /* 출력을 위해 꼬리 부분에 발생한 잉여 빈자리를 특별 추적 */
                }
                validDesksList = orderedDesks.filter(desk => !desk.classList.contains('is-empty'));
            }

            if (isRandom) {
                students = shuffleArray(students);
            }

            validDesksList.forEach((desk, index) => {
                const backElement = desk.querySelector('.desk-back');
                const st = students[index];
                backElement.innerHTML = `<span class="stu-num">${st.num}</span><span class="stu-name">${st.name}</span>`;
            });

            const emptyDesks = allDesks.filter(desk => desk.classList.contains('is-empty'));
            emptyDesks.forEach(desk => {
                const backElement = desk.querySelector('.desk-back');
                backElement.innerHTML = `<span class="stu-name">빈자리</span>`;
                backElement.classList.add('empty');
            });

            if (isRandom) {
                allDesks.forEach((desk, index) => {
                    setTimeout(() => { desk.classList.add('flipped'); }, 100 + (index * 40));
                });
            } else {
                validDesksList.forEach((desk, index) => {
                    setTimeout(() => { desk.classList.add('flipped'); }, 100 + (index * 60));
                });
                const emptyDelay = 100 + (validDesksList.length * 60);
                emptyDesks.forEach((desk, index) => {
                    setTimeout(() => { desk.classList.add('flipped'); }, emptyDelay + (index * 20));
                });
            }

        }, 400); 
    }

    function clearSeatsGrid() {
        buildInitialGrid(); // 경고 없이 즉시 초기화
    }

    function resetSeats() {
        if(confirm("이름 명단까지 싹 지우시겠습니까? (이 작업은 되돌릴 수 없습니다!)")) {
            classTitleInput.value = '';
            printClassTitle.textContent = '자리 배치표';
            document.querySelectorAll('.roster-slot').forEach(slot => {
                slot.querySelector('.slot-name').value = '';
                slot.querySelector('.slot-missing-checkbox').checked = false;
                slot.classList.remove('is-missing');
                slot.querySelector('.slot-name').disabled = false;
            });
            buildInitialGrid(); 
        }
    }

    totalNumbersInput.addEventListener('change', buildRosterList);
    rowsInput.addEventListener('change', buildInitialGrid);
    colsInput.addEventListener('change', buildInitialGrid);

    buildRosterList();
    buildInitialGrid();

    btnRandomize.addEventListener('click', () => assignSeats(true));
    btnSequential.addEventListener('click', () => assignSeats(false));

    window.addEventListener('beforeprint', () => {
        const rows = parseInt(rowsInput.value, 10);
        const cols = parseInt(colsInput.value, 10);
        const allDesks = Array.from(deskGrid.querySelectorAll('.desk'));
        
        let rowStyles = [];
        for (let r = 0; r < rows; r++) {
            let isRowEmpty = true;
            for (let c = 0; c < cols; c++) {
                const desk = allDesks[r * cols + c];
                // 'is-empty' 클래스가 없으면 학생이 있는 칸임
                if (desk && !desk.classList.contains('is-empty')) {
                    isRowEmpty = false;
                    break;
                }
            }
            // 전체 줄이 비어있으면 0px, 아니면 auto(내용만큼)
            if (isRowEmpty) {
                rowStyles.push('0px');
            } else {
                rowStyles.push('auto');
            }
        }
        deskGrid.style.setProperty('--print-rows', rowStyles.join(' '));
    });

    btnClearSeats.addEventListener('click', clearSeatsGrid);
    btnReset.addEventListener('click', resetSeats);
    btnPrint.addEventListener('click', () => window.print());
});
