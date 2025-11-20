/* Dashboard JS - ApexCharts + PDF export (optimized) */

document.addEventListener('DOMContentLoaded', () => {
  // Load students from localStorage
  let students = JSON.parse(localStorage.getItem('students')) || [];

  // Elements
  const studentForm = document.getElementById('studentForm');
  const tbody = document.querySelector('#studentTable tbody');
  const noRecords = document.getElementById('noRecords');

  const totalStudentsEl = document.getElementById('totalStudents');
  const avgMarksEl = document.getElementById('avgMarksCard');
  const avgAttendanceEl = document.getElementById('avgAttendance');
  const passPercentEl = document.getElementById('passPercent');

  const searchInput = document.getElementById('searchInput');
  const resetBtn = document.getElementById('resetBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');

  // Chart instances
  let subjectAvgChart = null, gradePieChart = null, scatterChart = null, topBarChart = null;

  // Utilities
  function computeGrade(m){
    return m >= 90 ? 'A' : m >= 75 ? 'B' : m >= 60 ? 'C' : m >= 40 ? 'D' : 'F';
  }

  function save(){
    localStorage.setItem('students', JSON.stringify(students));
  }

  // Add student
  if(studentForm){
    studentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const sName = (document.getElementById('sName').value || '').trim();
      const sRoll = (document.getElementById('sRoll').value || '').trim();
      const sSubject = (document.getElementById('sSubject').value || '').trim();
      const sMarks = Number(document.getElementById('sMarks').value || 0);
      const sAttendance = Number(document.getElementById('sAttendance').value || 0);

      // Basic validation
      if(!sName || !sRoll || !sSubject) return alert('Please fill all required fields.');
      if(sMarks < 0 || sMarks > 100) return alert('Marks must be between 0 and 100.');
      if(sAttendance < 0 || sAttendance > 100) return alert('Attendance must be between 0 and 100.');

      const grade = computeGrade(sMarks);
      students.push({ sName, sRoll, sSubject, sMarks, sAttendance, grade });
      save();
      studentForm.reset();
      renderAll();
    });
  }

  // Reset
  if(resetBtn){
    resetBtn.addEventListener('click', () => {
      if(confirm('Clear all stored student data?')){
        students = [];
        save();
        renderAll();
      }
    });
  }

  // Search
  if(searchInput){
    searchInput.addEventListener('input', function(){
      renderTable(this.value);
    });
  }

  // Table render
  function renderTable(query = ''){
    tbody.innerHTML = '';
    const q = (query || '').toLowerCase().trim();
    const filtered = students.filter(s => {
      if(!q) return true;
      return (s.sName || '').toLowerCase().includes(q) ||
             (s.sSubject || '').toLowerCase().includes(q) ||
             (s.sRoll || '').toLowerCase().includes(q);
    });

    if(filtered.length === 0){
      noRecords.style.display = 'block';
    } else {
      noRecords.style.display = 'none';
      filtered.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${escapeHtml(s.sName)}</td>
                        <td>${escapeHtml(s.sRoll)}</td>
                        <td>${escapeHtml(s.sSubject)}</td>
                        <td>${s.sMarks}</td>
                        <td>${s.sAttendance}</td>
                        <td>${s.grade}</td>`;
        tbody.appendChild(tr);
      });
    }
  }

  // cards
  function renderCards(){
    const total = students.length;
    totalStudentsEl.textContent = total;
    const avgMarks = total > 0 ? (students.reduce((a,b)=>a + Number(b.sMarks || 0), 0) / total).toFixed(2) : '0.00';
    avgMarksEl.textContent = avgMarks;
    const avgAttendance = total > 0 ? (students.reduce((a,b)=>a + Number(b.sAttendance || 0), 0) / total).toFixed(2) : '0.00';
    avgAttendanceEl.textContent = avgAttendance;
    const passCount = students.filter(s => Number(s.sMarks || 0) >= 40).length;
    passPercentEl.textContent = total > 0 ? ((passCount / total) * 100).toFixed(1) + '%' : '0%';
  }

  // Data builders for charts
  function buildSubjectAverage(){
    const map = {};
    students.forEach(s => {
      const subj = s.sSubject || 'Unknown';
      if(!map[subj]) map[subj] = { sum: 0, count: 0 };
      map[subj].sum += Number(s.sMarks || 0);
      map[subj].count += 1;
    });
    const labels = Object.keys(map);
    const data = labels.map(l => {
      const obj = map[l];
      return obj.count > 0 ? +(obj.sum / obj.count).toFixed(2) : 0;
    });
    return { labels, data };
  }

  function buildGradeDistribution(){
    const dist = { A:0,B:0,C:0,D:0,F:0 };
    students.forEach(s => {
      const g = s.grade || computeGrade(Number(s.sMarks || 0));
      if(dist[g] !== undefined) dist[g] += 1;
    });
    return dist;
  }

  function buildScatterData(){
    return students.map(s => ({ x: Number(s.sAttendance || 0), y: Number(s.sMarks || 0) }));
  }

  function buildTopPerformers(){
    const sorted = [...students].sort((a,b) => b.sMarks - a.sMarks).slice(0,5);
    return { names: sorted.map(s => s.sName), marks: sorted.map(s => s.sMarks) };
  }

  // Charts (ApexCharts) - create or update
  function renderCharts(){
    // Subject avg bar
    const sub = buildSubjectAverage();
    const subjectOptions = {
      chart:{ type:'bar', height:260, toolbar:{ show:false } },
      series:[{ name:'Avg Marks', data: sub.data }],
      xaxis:{ categories: sub.labels },
      yaxis:{ max: 100 },
      colors: [getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#2575fc']
    };
    if(subjectAvgChart){
      subjectAvgChart.updateOptions(subjectOptions);
      subjectAvgChart.updateSeries([{ data: sub.data }]);
    } else {
      subjectAvgChart = new ApexCharts(document.querySelector('#subjectAvgChart'), subjectOptions);
      subjectAvgChart.render();
    }

    // Grade donut
    const gd = buildGradeDistribution();
    const gradeLabels = Object.keys(gd);
    const gradeData = Object.values(gd);
    const gradeOptions = {
      chart:{ type:'donut', height:260, toolbar:{ show:false } },
      series: gradeData,
      labels: gradeLabels,
      colors: ['#2ecc71','#3498db','#f1c40f','#e67e22','#e74c3c']
    };
    if(gradePieChart){
      gradePieChart.updateOptions(gradeOptions);
      gradePieChart.updateSeries(gradeData);
    } else {
      gradePieChart = new ApexCharts(document.querySelector('#gradePieChart'), gradeOptions);
      gradePieChart.render();
    }

    // Scatter
    const scData = buildScatterData();
    const scatterOptions = {
      chart:{ type:'scatter', height:260, toolbar:{ show:false } },
      series: [{ name: 'Students', data: scData }],
      xaxis:{ title:{ text:'Attendance %' }, min:0, max:100 },
      yaxis:{ title:{ text:'Marks' }, min:0, max:100 }
    };
    if(scatterChart){
      scatterChart.updateOptions(scatterOptions);
      scatterChart.updateSeries([{ data: scData }]);
    } else {
      scatterChart = new ApexCharts(document.querySelector('#scatterChart'), scatterOptions);
      scatterChart.render();
    }

    // Top performers (horizontal)
    const top = buildTopPerformers();
    const topOptions = {
      chart:{ type:'bar', height:260, toolbar:{ show:false } },
      series:[{ name:'Marks', data: top.marks }],
      plotOptions:{ bar:{ horizontal:true } },
      xaxis:{ max:100 }
    };
    if(topBarChart){
      topBarChart.updateOptions({...topOptions, xaxis:{ categories: top.names }});
      topBarChart.updateSeries([{ data: top.marks }]);
    } else {
      topBarChart = new ApexCharts(document.querySelector('#topBarChart'), {...topOptions, xaxis:{ categories: top.names }});
      topBarChart.render();
    }
  }

  // Render everything
  function renderAll(){
    renderTable(searchInput ? searchInput.value : '');
    renderCards();
    renderCharts();
  }

  // Initial render
  renderAll();

  // PDF Export - html2canvas + jsPDF
  if(exportPdfBtn){
    exportPdfBtn.addEventListener('click', async () => {
      try{
        exportPdfBtn.disabled = true;
        exportPdfBtn.textContent = 'Preparing...';
        const root = document.getElementById('dashboardRoot');

        // temporarily increase background to white for PDF
        const oldBg = root.style.background;
        root.style.background = '#fff';

        const canvas = await html2canvas(root, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');

        // restore
        root.style.background = oldBg;

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const renderW = imgWidth * ratio;
        const renderH = imgHeight * ratio;

        pdf.addImage(imgData, 'PNG', (pdfWidth - renderW) / 2, 20, renderW, renderH);
        pdf.save('student-performance-report.pdf');

      } catch(err){
        console.error('PDF export error', err);
        alert('Could not export PDF. Try again.');
      } finally {
        exportPdfBtn.disabled = false;
        exportPdfBtn.textContent = 'Export PDF';
      }
    });
  }

  // debounced resize to update charts
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderCharts();
    }, 300);
  });

  // Escape HTML helper for table injection
  function escapeHtml(text){
    if(!text) return '';
    return text.replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]); });
  }

  // Expose for debugging (optional)
  window.__studentApp = {
    getAll: () => students,
    add: (s) => { students.push(s); save(); renderAll(); }
  };
});